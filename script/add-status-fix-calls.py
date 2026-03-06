import re

# Read the file
with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update getTasksByBoardWithUsers endpoint to fix statuses
old_code_1 = '''app.get("/api/boards/:boardId/full", async (req, res) => {
    try {
      const board = await storage.getBoard(req.params.boardId);
      if (!board) return res.status(404).json({ message: "Board not found" });
      const tasks = await storage.getTasksByBoardWithUsers(req.params.boardId);'''

new_code_1 = '''app.get("/api/boards/:boardId/full", async (req, res) => {
    try {
      const board = await storage.getBoard(req.params.boardId);
      if (!board) return res.status(404).json({ message: "Board not found" });
      let tasks = await storage.getTasksByBoardWithUsers(req.params.boardId);
      // Ensure all task statuses match their columns
      tasks = await ensureAllTasksStatusMatch(tasks);'''

content = content.replace(old_code_1, new_code_1)

# 2. Update my-tasks endpoint
old_code_2 = '''      // Enrich tasks with user and project data
      const enrichedTasks = tasks.map((t: any) => ({'''

new_code_2 = '''      // Ensure task statuses match columns before enriching
      const fixedTasks = await ensureAllTasksStatusMatch(tasks.map(t => t.task));
      
      // Enrich tasks with user and project data
      const enrichedTasks = fixedTasks.map((t: any) => ({'''

content = content.replace(old_code_2, new_code_2)

# Write back
with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Added status fixing to task retrieval endpoints!')
