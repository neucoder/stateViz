import React, { useState, useEffect } from 'react';
import { Modal, Input, Table, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataRow, calculateFormula } from '../../types';

const { TextArea } = Input;

interface InitialStateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DataRow[]) => void;
  initialData?: DataRow[];
}

// 将格式化日期的函数移到组件外部或顶部，以便复用
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

const InitialStateDialog: React.FC<InitialStateDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData = []
}) => {
  const [inputText, setInputText] = useState('');
  const [data, setData] = useState<DataRow[]>(initialData);
  const [savedData, setSavedData] = useState<DataRow[]>([]);

  // 当对话框打开时重置状态
  useEffect(() => {
    if (isOpen) {
      if (initialData.length > 0) {
        setData(initialData);
        setSavedData(initialData);
      } else if (savedData.length > 0) {
        setData(savedData);
      } else {
        setData([]);
      }
      setInputText('');
    }
  }, [isOpen, initialData]);

  const handleClose = () => {
    setInputText('');
    setData([]);
    onClose();
  };

  const parseData = () => {
    const rows = inputText.trim().split('\n');
    const parsedData: DataRow[] = rows.map((row, index) => {
      const [name, value] = row.trim().split(/\s+/);
      
      let parsedValue: string | number | Date;
      let type: DataRow['type'] = 'string';
      let dateFormat: 'date' | 'datetime' | undefined;
      let formula = '';
      let result: number | Date | undefined;
      let output = '';
      
      // 处理日期格式
      if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(value)) {
        parsedValue = new Date(value.replace(/\//g, '-'));
        type = 'date';
        dateFormat = 'date';
      }
      else if (/^\d{4}[-/]\d{2}[-/]\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
        parsedValue = new Date(value.replace(/\//g, '-'));
        type = 'date';
        dateFormat = 'datetime';
      }
      // 处理百分比格式
      else if (value.endsWith('%')) {
        parsedValue = parseFloat(value) / 100;
        type = 'percentage';
      }
      // 处理数字格式
      else if (!isNaN(Number(value))) {
        parsedValue = Number(value);
        type = 'number';
      }
      // 其他情况作为字符串处理
      else {
        parsedValue = value;
        type = 'string';
      }

      return {
        id: index + 1,
        name,
        value: parsedValue,
        type,
        dateFormat,
        formula,
        result,
        output
      };
    });

    // 设置解析后的数据到状态
    setData(parsedData);
    
    // 直接保存解析后的数据
    handleSave();
    
    // 清空输入文本
    setInputText('');
  };

  const handleAddRow = () => {
    setData([...data, {
      id: data.length + 1,
      name: '',
      value: '',
      type: 'string'
    }]);
  };

  const columns: ColumnsType<DataRow> = [
    {
      title: '序',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string, record: DataRow) => (
        <Input
          value={text}
          onChange={e => handleCellChange(record.id, 'name', e.target.value)}
        />
      ),
    },
    {
      title: '数据',
      dataIndex: 'value',
      key: 'value',
      width: 120,
      render: (_: any, record: DataRow) => {
        const displayValue = record.value instanceof Date
          ? formatDate(record.value, record.dateFormat)
          : record.value.toString();

        return (
          <Input
            value={displayValue}
            onChange={e => handleCellChange(record.id, 'value', e.target.value)}
          />
        );
      },
    },
    {
      title: '输出',
      dataIndex: 'output',
      key: 'output',
      width: 120,
      render: (text: string, record: DataRow) => (
        <Input
          value={text || ''}
          onChange={e => handleCellChange(record.id, 'output', e.target.value)}
        />
      ),
    },
    {
      title: '公式',
      dataIndex: 'formula',
      key: 'formula',
      width: 150,
      render: (text: string, record: DataRow) => (
        <Input
          value={text || ''}
          onChange={e => {
            const formula = e.target.value;
            handleCellChange(record.id, 'formula', formula);
          }}
          placeholder="例如: 名称1 * 名称2"
        />
      ),
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (_: any, record: DataRow) => {
        if (record.result === undefined) return '';
        if (record.result instanceof Date) {
          return formatDate(record.result, record.dateFormat);
        }
        if (typeof record.result === 'number') {
          return record.result.toFixed(3);
        }
        return '';
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DataRow) => (
        <Button type="link" danger onClick={() => handleDeleteRow(record.id)}>
          删除
        </Button>
      ),
    },
  ];

  const handleDeleteRow = (id: number) => {
    setData(data.filter(row => row.id !== id));
  };

  const handleCellChange = (
    id: number, 
    field: 'name' | 'value' | 'output' | 'formula' | 'dateFormat',
    newValue: string,
  ) => {
    setData(prevData => {
      const newData = prevData.map(row => {
        if (row.id === id) {
          if (field === 'value') {
            // 如果是日期类型，先保存为字符串
            if (row.type === 'date') {
              return {
                ...row,
                value: newValue, // 保持为字符串
                dateFormat: row.dateFormat || 'date'
              } as DataRow;
            }
            // 处理百分比
            if (row.type === 'percentage') {
              const numValue = parseFloat(newValue.replace('%', '')) / 100;
              return {
                ...row,
                value: isNaN(numValue) ? 0 : numValue
              } as DataRow;
            }
            // 处理数字
            if (row.type === 'number') {
              const numValue = Number(newValue);
              return {
                ...row,
                value: isNaN(numValue) ? 0 : numValue
              } as DataRow;
            }
            // 处理公式
            if (row.type === 'formula') {
              return {
                ...row,
                value: newValue,
                result: calculateFormula(newValue, prevData)
              } as DataRow;
            }
            // 其他类型直接保存值
            return { ...row, value: newValue } as DataRow;
          }
          
          // 处理其他字段的修改
          if (field === 'formula') {
            return {
              ...row,
              formula: newValue,
              result: newValue ? calculateFormula(newValue, prevData) : undefined
            } as DataRow;
          }
          if (field === 'output') {
            return { ...row, output: newValue } as DataRow;
          }
          if (field === 'dateFormat') {
            return { ...row, dateFormat: newValue as 'date' | 'datetime' } as DataRow;
          }
          return { ...row, [field]: newValue } as DataRow;
        }
        return row;
      });

      // 重新计算所有依赖此字段的公式
      return newData.map(row => {
        if (row.formula && row.id !== id) {
          return {
            ...row,
            result: calculateFormula(row.formula, newData)
          } as DataRow;
        }
        return row;
      });
    });
  };

  const handleSave = () => {
    if (data.length > 0) {
      try {
        // 在保存前重新计算所有公式并转换日期
        const formattedData = data.map(row => {
          const baseRow = {
            ...row,
            output: row.output || '',  // 确保输出列有值
            formula: row.formula || '' // 确保公式列有值
          };

          // 处理日期类型，将字符串转换为 Date 对象
          if (row.type === 'date') {
            try {
              const dateValue = new Date(row.value.toString().replace(/\//g, '-'));
              if (!isNaN(dateValue.getTime())) {
                return {
                  ...baseRow,
                  value: dateValue
                };
              }
            } catch (error) {
              console.error('Date conversion error:', error);
            }
          }
          
          // 如果有公式，计算结果
          if (row.formula) {
            try {
              return {
                ...baseRow,
                result: calculateFormula(row.formula, data)
              };
            } catch (error) {
              console.error('Formula calculation error for row:', row.name, error);
              return baseRow;
            }
          }
          
          return baseRow;
        });

        onSave(formattedData);
        setSavedData(formattedData);
      } catch (error) {
        console.error('Save error:', error);
      }
    }
  };

  // 格式化值显示
  const formatValue = (record: DataRow): string => {
    if (record.type === 'date' && record.value instanceof Date) {
      return formatDate(record.value, record.dateFormat);
    }
    if (record.type === 'percentage') {
      return `${(Number(record.value) * 100).toFixed(2)}%`;
    }
    if (record.type === 'formula' && record.value instanceof Date) {
      // 对于公式类型，如果原始值是日期，也需要正确格式化
      return formatDate(record.value, record.dateFormat);
    }
    return record.value.toString();
  };

  return (
    <Modal
      title="设置状态"
      open={isOpen}
      onCancel={handleClose}
      closeIcon={true}
      maskClosable={false}
      width={800}
      footer={[
        <Button key="add" onClick={handleAddRow}>
          添加行
        </Button>,
        <Button key="parse" type="default" onClick={parseData}>
          解析数据
        </Button>,
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSave}
          disabled={data.length === 0}
        >
          完成
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <TextArea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="请输入数据，每行一条，名称和值用空格分隔"
          rows={4}
        />
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Space>
    </Modal>
  );
};

export default InitialStateDialog; 