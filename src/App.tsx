import React, { useState } from 'react';
import { useMachine } from '@xstate/react';
import Canvas from './components/Canvas/Canvas';
import Controls from './components/Controls/Controls';
import InitialStateDialog from './components/InitialStateDialog/InitialStateDialog';
import { stateMachine } from './machines/stateMachine';
import styled from 'styled-components';
import { DataRow, StateTable, ShapeType } from './types';

// 应用容器样式
const AppContainer = styled.div`
  position: relative;
`;

function App() {
  // 初始化状态机
  const [state, send] = useMachine(stateMachine);
  // 从状态机上下文中解构需要的状态
  const { stateTables, stateTransitions, selectedTableId, isDialogOpen } = state.context;

  // 修改：使用 useState 管理画布元素
  const [canvasElements, setCanvasElements] = useState<ShapeType[]>([]);

  // 添加新的处理函数
  const handleUpdateTransition = (transitionId: string, text: string) => {
    send({ 
      type: 'UPDATE_TRANSITION', 
      transitionId, 
      text 
    });
  };

  // 修改：处理添加画布元素
  const handleAddShape = (shape: ShapeType) => {
    setCanvasElements(prev => [...prev, shape]);
  };

  // 修改：处理更新画布元素
  const handleUpdateShape = (shapeId: string, updates: Partial<ShapeType>) => {
    setCanvasElements(prev => 
      prev.map(shape => 
        shape.id === shapeId ? { ...shape, ...updates } : shape
      )
    );
  };

  // 修改：处理删除画布元素
  const handleDeleteShape = (shapeId: string) => {
    setCanvasElements(prev => prev.filter(shape => shape.id !== shapeId));
  };

  // 处理点击初始状态按钮
  const handleInitialState = () => {
    send({ type: 'OPEN_DIALOG', tableId: null });
  };

  // 处理设置规则（右键点击表格）
  const handleSetRules = (tableId: string, data: DataRow[]) => {
    send({ type: 'OPEN_DIALOG', tableId });
  };

  // 处理状态推演
  const handleSimulate = () => {
    console.log('开始推演');
  };

  // 处理保存状态数据
  const handleSaveInitialState = (data: DataRow[]) => {
    send({ type: 'SAVE_STATE', data });
  };

  // 处理表格移动
  const handleTableMove = (tableId: string, newPosition: { x: number, y: number }) => {
    send({ type: 'MOVE_TABLE', tableId, position: newPosition });
  };

  // 处理删除表格
  const handleDeleteTable = (tableId: string) => {
    send({ type: 'DELETE_TABLE', tableId });
  };

  return (
    <AppContainer>
      {/* 顶部控制按钮组件 */}
      <Controls
        onInitialState={handleInitialState}
        onSetRules={handleSetRules}
        onSimulate={handleSimulate}
      />
      {/* 画布组件 */}
      <Canvas
        stateTables={stateTables}
        stateTransitions={stateTransitions}
        shapes={canvasElements}
        onTableMove={handleTableMove}
        onSetRules={handleSetRules}
        onDeleteTable={handleDeleteTable}
        onUpdateTransition={handleUpdateTransition}
        onAddShape={handleAddShape}
        onUpdateShape={handleUpdateShape}
        onDeleteShape={handleDeleteShape}
      />
      {/* 状态设置对话框组件 */}
      <InitialStateDialog
        isOpen={isDialogOpen}
        onClose={() => send({ type: 'CLOSE_DIALOG' })}
        onSave={handleSaveInitialState}
        initialData={selectedTableId 
          ? stateTables.find((t: StateTable) => t.id === selectedTableId)?.data || []
          : []}
      />
    </AppContainer>
  );
}

export default App; 