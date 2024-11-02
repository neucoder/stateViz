import styled from 'styled-components';

export const ToolbarContainer = styled.div`
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
`;

export const ToolButton = styled.button<{ $isActive?: boolean }>`
  width: 40px;
  height: 40px;
  border: 1px solid ${props => props.$isActive ? '#1890ff' : '#d9d9d9'};
  background: ${props => props.$isActive ? '#e6f7ff' : 'white'};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  
  &:hover {
    border-color: #1890ff;
    background: #e6f7ff;
  }

  svg {
    font-size: 18px;
    color: ${props => props.$isActive ? '#1890ff' : 'rgba(0,0,0,0.65)'};
  }
`; 