import React from 'react';
import { Rect, Circle, Line, RegularPolygon, Text, Group } from 'react-konva';
import { ShapeType } from '../../types';
import { KonvaEventObject } from 'konva/lib/Node';
import { Line as KonvaLine } from 'konva/lib/shapes/Line';

interface ShapeRendererProps {
  shape: ShapeType;
  isSelected: boolean;
  onDragEnd: (id: string, pos: { x: number; y: number }) => void;
  onTransformEnd: (id: string, newSize: { width: number; height: number }) => void;
  onClick?: (e: any) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  isSelected,
  onDragEnd,
  onTransformEnd,
  onClick
}) => {
  const shapeProps = {
    id: shape.id,
    draggable: true,
    onClick,
    onDragEnd: (e: any) => {
      onDragEnd(shape.id, { x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: (e: any) => {
      const node = e.target;
      onTransformEnd(shape.id, {
        width: node.width() * node.scaleX(),
        height: node.height() * node.scaleY()
      });
    },
    stroke: isSelected ? '#1890ff' : '#333',
    strokeWidth: isSelected ? 2 : 1,
  };

  switch (shape.type) {
    case 'rectangle':
      return (
        <Rect
          {...shapeProps}
          {...shape.position}
          {...shape.size}
          fill="transparent"
        />
      );
    case 'line':
      return (
        <Group {...shape.position}>
          <Line
            {...shapeProps}
            points={[0, 0, shape.size.width, 0]}
            fill="transparent"
            className="line"
          />
          {isSelected && (
            <>
              <Circle
                x={0}
                y={0}
                radius={5}
                fill="#1890ff"
                draggable
                onDragMove={(e: KonvaEventObject<DragEvent>) => {
                  const parent = e.target.getParent();
                  if (!parent) return;
                  
                  const line = parent.findOne('.line') as KonvaLine;
                  if (!line) return;
                  
                  const points = [...line.points()];
                  points[0] = e.target.x();
                  points[1] = e.target.y();
                  line.points(points);
                }}
              />
              <Circle
                x={shape.size.width}
                y={0}
                radius={5}
                fill="#1890ff"
                draggable
                onDragMove={(e: KonvaEventObject<DragEvent>) => {
                  const parent = e.target.getParent();
                  if (!parent) return;
                  
                  const line = parent.findOne('.line') as KonvaLine;
                  if (!line) return;
                  
                  const points = [...line.points()];
                  points[2] = e.target.x();
                  points[3] = e.target.y();
                  line.points(points);
                }}
              />
            </>
          )}
        </Group>
      );
    case 'text':
      return (
        <Text
          {...shapeProps}
          {...shape.position}
          text={shape.text || ''}
          fontSize={16}
          fill="#333"
        />
      );
    default:
      return null;
  }
};

export default ShapeRenderer; 