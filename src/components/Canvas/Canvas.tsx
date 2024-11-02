import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Stage, Layer, Rect, Text, Group, Arrow, Circle, Line, Shape } from 'react-konva';
import styled from 'styled-components';
import { Input } from 'antd';
import { DataRow, StateTable, StateTransition, ShapeType, calculateArrowPoints } from '../../types';
import Toolbar from '../Toolbar/Toolbar';
import ShapeRenderer from '../Shapes/ShapeRenderer';
import TransformerComponent from '../Shapes/TransformerComponent';

// 画布容器样式
const CanvasContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
`;

// 画布组件属性接口
interface CanvasProps {
  stateTables: StateTable[];
  stateTransitions: StateTransition[];
  shapes: ShapeType[];
  onTableMove: (tableId: string, newPosition: { x: number, y: number }) => void;
  onSetRules: (tableId: string, data: DataRow[]) => void;
  onDeleteTable: (tableId: string) => void;
  onUpdateTransition: (transitionId: string, text: string) => void;
  onAddShape: (shape: ShapeType) => void;
  onUpdateShape: (shapeId: string, updates: Partial<ShapeType>) => void;
  onDeleteShape: (shapeId: string) => void;
}

// 添加 formatDate 函数到组件顶部
const formatDate = (date: Date, format: 'date' | 'datetime' = 'date') => {
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  
  if (format === 'datetime') {
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  return `${year}-${month}-${day}`;
};

const Canvas: React.FC<CanvasProps> = ({
  stateTables,
  stateTransitions,
  shapes,
  onTableMove,
  onSetRules,
  onDeleteTable,
  onUpdateTransition,
  onAddShape,
  onUpdateShape,
  onDeleteShape,
}) => {
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [editingText, setEditingText] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const stageRef = useRef<any>(null);

  // 状态定义
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // 添加选中形状的状态
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // 添加拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragShape, setDragShape] = useState<ShapeType | null>(null);

  // 添加形状处理函数
  const handleStageClick = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedShapeId(null);
      return;
    }
  };

  const handleShapeClick = (e: any, shapeId: string) => {
    e.cancelBubble = true;
    setSelectedShapeId(shapeId);
  };

  const handleCanvasClick = (e: any) => {
    if (selectedTool && e.target === e.target.getStage()) {
      const pos = e.target.getStage().getPointerPosition();
      const newShape: ShapeType = {
        id: `shape-${Date.now()}`,
        type: selectedTool as ShapeType['type'],
        position: { x: pos.x, y: pos.y },
        size: { width: 100, height: 100 },
      };
      onAddShape(newShape);
      setSelectedTool('');
    }
  };

  // 处理键盘事件（删除表格）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedTableId) {
        onDeleteTable(selectedTableId);
        setSelectedTableId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTableId, onDeleteTable]);

  // 处理滚轮缩放
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.01;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    
    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    setScale(newScale);
    setPosition({
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
    });
  };

  // 格式化值显示
  const formatValue = (value: string | number | Date, type: string, dateFormat?: 'date' | 'datetime'): string => {
    if (type === 'date' && value instanceof Date) {
      return formatDate(value, dateFormat);
    }
    if (type === 'percentage') {
      return `${(Number(value) * 100).toFixed(2)}%`;
    }
    if (type === 'formula') {
      if (value instanceof Date) {
        return formatDate(value, dateFormat);
      }
      return value.toString();
    }
    return value.toString();
  };

  // 处理右键菜单（设置规则）
  const handleContextMenu = useCallback((e: any, tableId: string, data: DataRow[]) => {
    e.evt.preventDefault();
    onSetRules(tableId, [...data]);
  }, [onSetRules]);

  // 获取表格中心点坐标
  const getTableCenter = (table: StateTable) => ({
    x: table.position.x + 200,
    y: table.position.y + (table.data.length + 1) * 20
  });

  // 计算表格边缘的连接点
  const getIntersectionPoint = (table: StateTable, targetPoint: { x: number, y: number }) => {
    const tableWidth = 400;
    const tableHeight = (table.data.length + 1) * 40;
    const tableCenter = {
      x: table.position.x + tableWidth / 2,
      y: table.position.y + tableHeight / 2
    };

    // 计算方向向量
    const dx = targetPoint.x - tableCenter.x;
    const dy = targetPoint.y - tableCenter.y;

    // 计算与表格边界的交点
    let intersectX, intersectY;
    const slope = Math.abs(dy / dx);
    const aspectRatio = tableHeight / tableWidth;

    if (slope > aspectRatio) {
      // 与上/下边界相交
      intersectX = tableCenter.x + (dy > 0 ? tableHeight / 2 / slope : -tableHeight / 2 / slope);
      intersectY = tableCenter.y + (dy > 0 ? tableHeight / 2 : -tableHeight / 2);
    } else {
      // 与左/右边界相交
      intersectX = tableCenter.x + (dx > 0 ? tableWidth / 2 : -tableWidth / 2);
      intersectY = tableCenter.y + (dx > 0 ? tableWidth / 2 * slope : -tableWidth / 2 * slope);
    }

    return { x: intersectX, y: intersectY };
  };

  // 处理双击箭头事件
  const handleArrowDblClick = (e: any, transitionId: string) => {
    const stage = e.target.getStage();
    const position = stage.getPointerPosition();
    setEditingText({
      id: transitionId,
      text: stateTransitions.find(t => t.id === transitionId)?.text || '',
      x: position.x,
      y: position.y
    });
  };

  // 修改处理画布双击事件
  const handleStageDblClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      setEditingText({
        id: `text-${Date.now()}`,
        text: '',
        x: pos.x,
        y: pos.y
      });
    }
  };

  // 修改处理文本编辑完成的函数
  const handleTextEditComplete = (text: string) => {
    if (editingText && text.trim()) {
      const newShape: ShapeType = {
        id: editingText.id,
        type: 'text',
        position: { 
          x: editingText.x, 
          y: editingText.y 
        },
        size: { width: 0, height: 0 },
        text: text.trim()
      };
      onAddShape(newShape);  // 添加到画布元素中
    }
    setEditingText(null);
  };

  // 修改处理鼠标移动的函数
  const handleMouseMove = (e: any) => {
    if (selectedTool && !isDragging) {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const newShape: ShapeType = {
        id: `shape-${Date.now()}`,
        type: selectedTool as ShapeType['type'],
        position: { 
          x: pos.x - (selectedTool === 'line' ? 50 : 25), 
          y: pos.y - (selectedTool === 'line' ? 1 : 25) 
        },
        size: { 
          width: selectedTool === 'line' ? 100 : 50, 
          height: selectedTool === 'line' ? 2 : 50 
        },
      };
      setDragShape(newShape);
    }
  };

  // 修改处理鼠标点击的函数
  const handleMouseDown = (e: any) => {
    if (selectedTool && e.target === e.target.getStage()) {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const newShape: ShapeType = {
        id: `shape-${Date.now()}`,
        type: selectedTool as ShapeType['type'],
        position: { 
          x: pos.x - (selectedTool === 'line' ? 50 : 25), 
          y: pos.y - (selectedTool === 'line' ? 1 : 25) 
        },
        size: { 
          width: selectedTool === 'line' ? 100 : 50, 
          height: selectedTool === 'line' ? 2 : 50 
        },
      };
      onAddShape(newShape);
      setSelectedTool('');
      setDragShape(null);
    }
  };

  // 修改处理工具选择的函数
  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool);
    setDragShape(null);
  };

  return (
    <CanvasContainer>
      <Toolbar
        selectedTool={selectedTool}
        onSelectTool={handleToolSelect}
        onExportImage={() => {
          if (stageRef.current) {
            const uri = stageRef.current.toDataURL();
            const link = document.createElement('a');
            link.download = 'canvas.png';
            link.href = uri;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }}
      />
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onWheel={handleWheel}
        scale={{ x: scale, y: scale }}
        position={position}
        draggable={!selectedTool}
        onDblClick={handleStageDblClick}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
      >
        <Layer>
          {/* 渲染拖动中的形状 */}
          {dragShape && (
            <ShapeRenderer
              shape={dragShape}
              isSelected={false}
              onDragEnd={() => {}}
              onTransformEnd={() => {}}
            />
          )}

          {/* 渲染已保存的形状 */}
          {shapes.map(shape => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={selectedShapeId === shape.id}
              onDragEnd={(id, pos) => onUpdateShape(id, { position: pos })}
              onTransformEnd={(id, size) => onUpdateShape(id, { size })}
              onClick={(e) => {
                e.cancelBubble = true;
                setSelectedShapeId(shape.id);
              }}
            />
          ))}

          {/* 变换控制器 */}
          <TransformerComponent selectedId={selectedShapeId} />

          {/* 渲染状态转换（箭头） */}
          {stateTransitions.map(transition => {
            const fromTable = stateTables.find(t => t.id === transition.fromId);
            const toTable = stateTables.find(t => t.id === transition.toId);
            if (!fromTable || !toTable) return null;

            const points = calculateArrowPoints(fromTable, toTable);
            
            return (
              <Group key={transition.id}>
                <Arrow
                  points={points}
                  stroke="#333"
                  fill="#333"
                  strokeWidth={2}
                  pointerLength={10}
                  pointerWidth={10}
                  onDblClick={(e) => handleArrowDblClick(e, transition.id)}
                />
                {transition.text && (
                  <Text
                    x={(points[0] + points[2]) / 2}
                    y={(points[1] + points[3]) / 2}
                    text={transition.text}
                    fontSize={14}
                    fill="#333"
                  />
                )}
              </Group>
            );
          })}

          {/* 渲染状态表格 */}
          {stateTables.map(table => (
            <Group
              key={table.id}
              x={table.position.x}
              y={table.position.y}
              draggable
              onClick={() => setSelectedTableId(table.id)}
              onDragEnd={(e) => {
                onTableMove(table.id, { x: e.target.x(), y: e.target.y() });
              }}
              onContextMenu={(e) => handleContextMenu(e, table.id, table.data)}
            >
              {/* 选中状态的边框 */}
              {selectedTableId === table.id && (
                <Rect
                  width={400}
                  height={(table.data.length + 1) * 40}
                  stroke="#1890ff"
                  strokeWidth={2}
                />
              )}
              
              {/* 表格头部 */}
              <Rect
                width={700}
                height={40}
                fill={selectedTableId === table.id ? '#e6f7ff' : '#f5f5f5'}
                stroke="#ddd"
              />
              <Text
                x={10}
                y={10}
                text="序号"
                width={60}
                height={40}
                verticalAlign="middle"
              />
              <Text
                x={70}
                y={10}
                text="名称"
                width={100}
                height={40}
                verticalAlign="middle"
              />
              <Text
                x={190}
                y={10}
                text="数据"
                width={100}
                height={40}
                verticalAlign="middle"
              />
              <Text
                x={310}
                y={10}
                text="输出"
                width={100}
                height={40}
                verticalAlign="middle"
              />
              <Text
                x={430}
                y={10}
                text="公式"
                width={100}
                height={40}
                verticalAlign="middle"
              />
              <Text
                x={550}
                y={10}
                text="结果"
                width={100}
                height={40}
                verticalAlign="middle"
              />
              
              {/* 表格数据行 */}
              {table.data.map((row: DataRow, index: number) => (
                <Group key={row.id} y={(index + 1) * 40}>
                  <Rect
                    width={700}
                    height={40}
                    fill="white"
                    stroke="#ddd"
                  />
                  <Text
                    x={10}
                    y={10}
                    text={row.id.toString()}
                    width={60}
                    height={40}
                    verticalAlign="middle"
                  />
                  <Text
                    x={70}
                    y={10}
                    text={row.name}
                    width={100}
                    height={40}
                    verticalAlign="middle"
                  />
                  <Text
                    x={190}
                    y={10}
                    text={formatValue(row.value, row.type, row.dateFormat)}
                    width={120}
                    height={40}
                    verticalAlign="middle"
                  />
                  <Text
                    x={310}
                    y={10}
                    text={row.output || ''}
                    width={100}
                    height={40}
                    verticalAlign="middle"
                  />
                  <Text
                    x={430}
                    y={10}
                    text={row.formula || ''}
                    width={100}
                    height={40}
                    verticalAlign="middle"
                  />
                  <Text
                    x={550}
                    y={10}
                    text={
                      row.result !== undefined
                        ? (row.result instanceof Date
                          ? formatDate(row.result, row.dateFormat)
                          : typeof row.result === 'number'
                            ? row.result.toFixed(3)
                            : '')
                        : ''
                    }
                    width={100}
                    height={40}
                    verticalAlign="middle"
                  />
                </Group>
              ))}
            </Group>
          ))}
        </Layer>
      </Stage>

      {/* 文本编辑输入框 */}
      {editingText && (
        <Input
          autoFocus
          style={{
            position: 'fixed',
            left: editingText.x,
            top: editingText.y,
            width: 200,
            zIndex: 1000
          }}
          defaultValue={editingText.text}
          onBlur={(e) => handleTextEditComplete(e.target.value)}
          onPressEnter={(e) => {
            handleTextEditComplete((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();  // 添加这行，确保输入框失去焦点
          }}
        />
      )}
    </CanvasContainer>
  );
};

export default Canvas; 