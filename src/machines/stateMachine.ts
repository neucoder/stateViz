import { createMachine, assign } from 'xstate';
import { DataRow, StateTable, StateTransition, calculateFormula, ShapeType } from '../types';

// 定义状态机上下文接口
interface Context {
  stateTables: StateTable[];
  stateTransitions: StateTransition[];
  selectedTableId: string | null;
  isDialogOpen: boolean;
}

// 定义状态机事件类型
type Events = 
  | { type: 'OPEN_DIALOG'; tableId: string | null }
  | { type: 'CLOSE_DIALOG' }
  | { type: 'SAVE_STATE'; data: DataRow[] }
  | { type: 'MOVE_TABLE'; tableId: string; position: { x: number; y: number } }
  | { type: 'DELETE_TABLE'; tableId: string }
  | { type: 'UPDATE_TRANSITION'; transitionId: string; text: string };

// 从 localStorage 加载状态
const loadState = (): { stateTables: StateTable[], stateTransitions: StateTransition[] } => {
  try {
    const savedState = localStorage.getItem('visualizationState');
    if (savedState) {
      const { stateTables, stateTransitions } = JSON.parse(savedState);
      
      // 处理所有表格的数据
      const processedTables = stateTables.map((table: StateTable) => ({
        ...table,
        data: table.data.map((row: DataRow) => {
          // 处理日期类型
          if (row.type === 'date' && typeof row.value === 'string') {
            return {
              ...row,
              value: new Date(row.value)
            };
          }
          return row;
        })
      }));

      // 重新计算所有表格中的公式
      processedTables.forEach((table: StateTable) => {
        table.data = recalculateFormulas(table.data, processedTables);
      });

      return { 
        stateTables: processedTables, 
        stateTransitions 
      };
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
  return { stateTables: [], stateTransitions: [] };
};

// 保存状态到 localStorage，确保日期格式正确
const saveState = (stateTables: StateTable[], stateTransitions: StateTransition[]) => {
  try {
    const processedTables = stateTables.map(table => ({
      ...table,
      data: table.data.map(row => {
        if (row.type === 'date' && row.value instanceof Date) {
          return {
            ...row,
            value: row.value.toISOString()
          };
        }
        if (row.formula) {
          return {
            ...row,
            result: calculateFormula(row.formula, table.data, stateTables)
          };
        }
        return {
          ...row,
          output: row.output || '',
          formula: row.formula || '',
          result: row.result
        };
      })
    }));
    
    localStorage.setItem('visualizationState', 
      JSON.stringify({ stateTables: processedTables, stateTransitions })
    );
  } catch (error) {
    console.error('Failed to save state:', error);
  }
};

// 重新计算所有公式结果
const recalculateFormulas = (data: DataRow[], stateTables: StateTable[]): DataRow[] => {
  return data.map(row => {
    if (row.type === 'formula' && row.formula) {
      return {
        ...row,
        result: calculateFormula(row.formula, data, stateTables)
      };
    }
    return row;
  });
};

// 修改初始上下文
const initialContext: Context = {
  stateTables: [],
  stateTransitions: [],
  selectedTableId: null,
  isDialogOpen: false
};

// 创建状态机
export const stateMachine = createMachine<Context, Events>({
  id: 'stateVisualization',
  initial: 'idle',
  context: initialContext,
  states: {
    idle: {
      on: {
        OPEN_DIALOG: {
          target: 'dialogOpen',
          actions: assign({
            isDialogOpen: (_) => true,
            selectedTableId: (_, event) => event.tableId,
          }),
        },
        MOVE_TABLE: {
          actions: [
            assign({
              stateTables: (context, event) => {
                const newTables = context.stateTables.map((table) =>
                  table.id === event.tableId
                    ? { ...table, position: event.position }
                    : table
                );
                saveState(newTables, context.stateTransitions);  // 保存状态
                return newTables;
              },
            }),
          ],
        },
        DELETE_TABLE: {
          actions: [
            assign({
              stateTables: (context, event) => {
                const newTables = context.stateTables.filter(
                  table => table.id !== event.tableId
                );
                const newTransitions = context.stateTransitions.filter(
                  trans => trans.fromId !== event.tableId && trans.toId !== event.tableId
                );
                saveState(newTables, newTransitions);  // 保存状态
                return newTables;
              },
              stateTransitions: (context, event) =>
                context.stateTransitions.filter(
                  trans => trans.fromId !== event.tableId && trans.toId !== event.tableId
                ),
            }),
          ],
        },
        CLOSE_DIALOG: {
          actions: assign({
            isDialogOpen: (_) => false,
            selectedTableId: (_) => null,
          }),
        },
        UPDATE_TRANSITION: {
          actions: assign({
            stateTransitions: (context, event) => context.stateTransitions.map(
              transition => transition.id === event.transitionId
                ? { ...transition, text: event.text }
                : transition
            )
          })
        }
      },
    },
    dialogOpen: {
      on: {
        SAVE_STATE: {
          target: 'idle',
          actions: [
            assign({
              stateTables: (context, event) => {
                let newTables = [...context.stateTables];
                const recalculatedData = recalculateFormulas(event.data, context.stateTables);  // 重新计算公式结果
                
                if (context.selectedTableId) {
                  const sourceTable = context.stateTables.find(
                    (t) => t.id === context.selectedTableId
                  );
                  if (!sourceTable) return newTables;

                  const newTableId = `table-${Date.now()}`;
                  const newTable: StateTable = {
                    id: newTableId,
                    position: {
                      x: sourceTable.position.x + 500,
                      y: sourceTable.position.y,
                    },
                    data: recalculatedData,  // 使用重新计算后的数据
                  };
                  newTables = [...newTables, newTable];
                } else {
                  const newTable: StateTable = {
                    id: `table-${Date.now()}`,
                    position: { x: 100, y: 100 },
                    data: recalculatedData,  // 使用重新计算后的数据
                  };
                  newTables = [...newTables, newTable];
                }
                saveState(newTables, context.stateTransitions);
                return newTables;
              },
              stateTransitions: (context) => {
                if (context.selectedTableId) {
                  const newTransition: StateTransition = {
                    id: `transition-${Date.now()}`,
                    fromId: context.selectedTableId,
                    toId: `table-${Date.now()}`,
                  };
                  const newTransitions = [...context.stateTransitions, newTransition];
                  saveState(context.stateTables, newTransitions);  // 保存状态
                  return newTransitions;
                }
                return context.stateTransitions;
              },
            }),
          ],
        },
        CLOSE_DIALOG: {
          target: 'idle',
          actions: assign({
            isDialogOpen: (_) => false,
            selectedTableId: (_) => null,
          }),
        },
      },
    },
  },
}); 