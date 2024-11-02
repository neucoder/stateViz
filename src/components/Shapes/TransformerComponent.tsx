import React, { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';

interface TransformerComponentProps {
  selectedId: string | null;
}

const TransformerComponent: React.FC<TransformerComponentProps> = ({ selectedId }) => {
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = transformerRef.current.getStage();
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  return (
    <Transformer
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) => {
        // 限制最小尺寸
        const minSize = 20;
        if (newBox.width < minSize || newBox.height < minSize) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
};

export default TransformerComponent; 