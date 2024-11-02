import React from 'react';
import { 
  BorderOutlined, 
  MinusOutlined, 
  RightOutlined,
  SaveOutlined,
  BorderlessTableOutlined
} from '@ant-design/icons';
import { ToolbarContainer, ToolButton } from './styles';

interface ToolbarProps {
  selectedTool: string;
  onSelectTool: (tool: string) => void;
  onExportImage: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  onSelectTool,
  onExportImage
}) => {
  return (
    <ToolbarContainer>
      <ToolButton 
        $isActive={selectedTool === 'rectangle'}
        onClick={() => onSelectTool('rectangle')}
        title="矩形"
      >
        <BorderlessTableOutlined />
      </ToolButton>
      <ToolButton 
        $isActive={selectedTool === 'line'}
        onClick={() => onSelectTool('line')}
        title="直线"
      >
        <MinusOutlined />
      </ToolButton>
      <ToolButton 
        $isActive={selectedTool === 'diamond'}
        onClick={() => onSelectTool('diamond')}
        title="菱形"
      >
        <RightOutlined style={{ transform: 'rotate(45deg)' }} />
      </ToolButton>
      <ToolButton 
        onClick={onExportImage}
        title="导出图片"
      >
        <SaveOutlined />
      </ToolButton>
    </ToolbarContainer>
  );
};

export default Toolbar; 