import React from 'react';
import { Button, Space } from 'antd';
import styled from 'styled-components';
import { DataRow } from '../../types';

const ControlsContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
`;

interface ControlsProps {
  onInitialState: () => void;
  onSetRules: (tableId: string, data: DataRow[]) => void;
  onSimulate: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  onInitialState,
  onSetRules,
  onSimulate,
}) => {
  return (
    <ControlsContainer>
      <Space>
        <Button type="primary" onClick={onInitialState}>
          初始状态
        </Button>
        <Button onClick={() => onSetRules('', [])}>
          设置规则
        </Button>
        <Button onClick={onSimulate}>
          推演状态
        </Button>
      </Space>
    </ControlsContainer>
  );
};

export default Controls; 