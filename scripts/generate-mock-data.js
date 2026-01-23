const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'todos.json');

const generateMockData = () => {
  const todos = [];
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  // Generate data for the past 45 days
  for (let i = 0; i < 45; i++) {
    const date = now - i * ONE_DAY;
    const count = Math.floor(Math.random() * 5) + 2; // 2-6 todos per day
    
    for (let j = 0; j < count; j++) {
      const isCompleted = Math.random() > 0.3;
      const createdAt = date + Math.floor(Math.random() * ONE_DAY);
      const completedAt = isCompleted ? createdAt + Math.floor(Math.random() * (ONE_DAY * 0.5)) : undefined;
      
      todos.push({
        id: `mock-${i}-${j}`,
        text: `Mock Task ${i}-${j}`,
        completed: isCompleted,
        createdAt,
        completedAt,
        deleted: false
      });
    }
  }
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
  console.log(`✅ Generated ${todos.length} mock todos in ${DATA_FILE}`);
};

generateMockData();
