// 定义单条数据的接口
export interface DataRow {
  id: number;          // 数据行ID
  name: string;        // 数据名称
  value: string | number | Date;  // 数据值
  type: 'string' | 'number' | 'date' | 'datetime' | 'percentage' | 'formula';  // 数据类型
  dateFormat?: 'date' | 'datetime';  // 新增日期格式字段
  output?: string;    // 新增输出字段
  formula?: string;    // 公式
  result?: number | Date;     // 修改：计算结果可以是数字或日期
}

// 定义状态表格的接口
export interface StateTable {
  id: string;         // 表格ID
  position: { x: number; y: number };  // 表格在画布中的位置
  data: DataRow[];    // 表格数据
}

// 定义状态转换（箭头）的接口
export interface StateTransition {
  id: string;         // 转换ID
  fromId: string;     // 起始表格ID
  toId: string;       // 目标表格ID
  text?: string;      // 添加文本字段
}

// 添加形状类型定义
export interface ShapeType {
  id: string;
  type: 'rectangle' | 'line' | 'diamond' | 'text';
  position: { x: number; y: number };
  size: { width: number; height: number };
  text?: string;
}

// 修改箭头点计算函数
export const calculateArrowPoints = (fromTable: StateTable, toTable: StateTable): number[] => {
  const tableWidth = 700;  // 表格宽度
  const fromTableHeight = (fromTable.data.length + 1) * 40;  // 表格高度
  const toTableHeight = (toTable.data.length + 1) * 40;

  // 计算表格的中心点
  const fromCenter = {
    x: fromTable.position.x + tableWidth / 2,
    y: fromTable.position.y + fromTableHeight / 2
  };

  const toCenter = {
    x: toTable.position.x + tableWidth / 2,
    y: toTable.position.y + toTableHeight / 2
  };

  // 计算两个表格中心点之间的差值
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  // 确定箭头应该从哪个边缘出发
  let fromPoint = { x: 0, y: 0 };
  let toPoint = { x: 0, y: 0 };

  // 判断目标表格相对于源表格的位置
  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平方向的距离更大，从左右边缘连接
    if (dx > 0) {
      // 目标在右边
      fromPoint = {
        x: fromTable.position.x + tableWidth,
        y: fromTable.position.y + fromTableHeight / 2
      };
      toPoint = {
        x: toTable.position.x,
        y: toTable.position.y + toTableHeight / 2
      };
    } else {
      // 目标在左边
      fromPoint = {
        x: fromTable.position.x,
        y: fromTable.position.y + fromTableHeight / 2
      };
      toPoint = {
        x: toTable.position.x + tableWidth,
        y: toTable.position.y + toTableHeight / 2
      };
    }
  } else {
    // 垂直方向的距离更大，从上下边缘连接
    if (dy > 0) {
      // 目标在下边
      fromPoint = {
        x: fromTable.position.x + tableWidth / 2,
        y: fromTable.position.y + fromTableHeight
      };
      toPoint = {
        x: toTable.position.x + tableWidth / 2,
        y: toTable.position.y
      };
    } else {
      // 目标在上边
      fromPoint = {
        x: fromTable.position.x + tableWidth / 2,
        y: fromTable.position.y
      };
      toPoint = {
        x: toTable.position.x + tableWidth / 2,
        y: toTable.position.y + toTableHeight
      };
    }
  }

  // 添加一些偏移量以避免箭头完全贴着表格边缘
  const offset = 5;
  if (dx > 0) {
    fromPoint.x += offset;
    toPoint.x -= offset;
  } else if (dx < 0) {
    fromPoint.x -= offset;
    toPoint.x += offset;
  }
  if (dy > 0) {
    fromPoint.y += offset;
    toPoint.y -= offset;
  } else if (dy < 0) {
    fromPoint.y -= offset;
    toPoint.y += offset;
  }

  return [
    fromPoint.x,
    fromPoint.y,
    toPoint.x,
    toPoint.y
  ];
};

// 添加计算表格边缘交点的辅助函数
function getTableIntersection(
  center: { x: number; y: number },
  angle: number,
  width: number,
  height: number
): { x: number; y: number } {
  // 表格的半宽和半高
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // 计算与水平边的交点
  const xTop = center.x + (halfHeight / Math.tan(angle));
  const xBottom = center.x - (halfHeight / Math.tan(angle));
  
  // 计算与垂直边的交点
  const yLeft = center.y - (halfWidth * Math.tan(angle));
  const yRight = center.y + (halfWidth * Math.tan(angle));

  // 确定交点在哪条边上
  if (Math.abs(angle) < Math.PI / 4) { // 右边
    return {
      x: center.x + halfWidth,
      y: yRight
    };
  } else if (Math.abs(angle) > 3 * Math.PI / 4) { // 左边
    return {
      x: center.x - halfWidth,
      y: yLeft
    };
  } else if (angle > 0) { // 下边
    return {
      x: xBottom,
      y: center.y + halfHeight
    };
  } else { // 上边
    return {
      x: xTop,
      y: center.y - halfHeight
    };
  }
}

// 计算公式结果的工具函数
export const calculateFormula = (formula: string, data: DataRow[], stateTables?: StateTable[]): number => {
  try {
    let expression = formula.trim();
    
    // 合并所有可用的数据源
    let allData = [...data];
    if (stateTables) {
      stateTables.forEach(table => {
        allData = [...allData, ...table.data];
      });
    }
    
    // 按名称长度降序排序，避免部分匹配问题
    const sortedData = [...allData].sort((a, b) => b.name.length - a.name.length);
    
    // 创建一个 Map 来存储唯一的名称和它们的最新值
    const nameValueMap = new Map();
    sortedData.forEach(row => {
      if (!row.name) return;
      
      // 获取值，优先使用原始 value，避免使用可能变化的 result
      let value: number;
      if (row.type === 'percentage') {
        value = Number(row.value);
      } else if (row.type === 'number') {
        value = Number(row.value);
      } else if (row.type === 'formula') {
        // 对于公式类型，使用原始值而不是结果
        value = Number(row.value) || 0;
      } else {
        const numValue = Number(row.value);
        value = isNaN(numValue) ? 0 : numValue;
      }
      
      // 只保存第一次出现的名称的值
      if (!nameValueMap.has(row.name)) {
        nameValueMap.set(row.name, value);
      }
    });
    
    // 检查并替换表达式中的变量名
    const variables = Array.from(nameValueMap.keys());
    const unresolved = variables.filter(name => expression.includes(name));
    
    if (unresolved.length === 0 && /[a-zA-Z\u4e00-\u9fa5]/.test(expression)) {
      console.warn('Formula contains unknown variables:', expression);
      return 0;
    }
    
    // 替换表达式中的变量名
    unresolved.forEach(name => {
      const value = nameValueMap.get(name);
      // 修改正则表达式以支持中文
      const regex = new RegExp(`(^|[^\\u4e00-\\\u9fa5\\w])${name}(?=[^\\u4e00-\\\u9fa5\\w]|$)`, 'g');
      expression = expression.replace(regex, `$1${value}`);
    });
    
    // 检查表达式是否只包含合法的数学运算符
    if (!/^[0-9\s\+\-\*\/\(\)\.]+$/.test(expression)) {
      console.warn('Formula contains invalid operators:', expression);
      return 0;
    }
    
    // 安全地执行表达式
    const result = new Function(`return ${expression}`)();
    return typeof result === 'number' ? result : 0;
    
  } catch (error) {
    console.error('Formula calculation error:', error);
    return 0;
  }
}; 