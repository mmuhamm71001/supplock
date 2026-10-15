// Every action the log records, with its badge colors (text, background).
export const ACTIONS: Record<string, [string, string]> = {
  Requested: ['#1a2c54', '#dde2ee'], Approved: ['#fff', '#4d7b93'], Denied: ['#fff', '#5c4766'], Deducted: ['#fff', '#8351a8'],
  Adjustment: ['#2e0f38', '#e6dbef'], 'Reorder placed': ['#fff', '#1a2c54'], 'Arrival date changed': ['#1a2c54', '#dde2ee'], Received: ['#fff', '#2f4f60'],
  'Laptop checkout': ['#6e2c74', '#f1dff3'], 'Laptop assigned': ['#6e2c74', '#f1dff3'], 'Laptop return': ['#2f4f60', '#dce8ee'],
  'Item added': ['#2e0f38', '#e6dbef'], 'Item removed': ['#fff', '#8c1c45'], 'Space created': ['#fff', '#5e3680'],
  'Space item': ['#2e0f38', '#f1dff3'], 'Space adjustment': ['#2e0f38', '#e6dbef'], 'Space count': ['#fff', '#1a2c54'], 'Placed in space': ['#fff', '#4d7b93']
};
