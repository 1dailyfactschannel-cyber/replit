import { Request, Response, NextFunction } from "express";
import { storage } from "../postgres-storage";

/**
 * Middleware to check if user owns a resource
 * @param entityType Type of entity to check ('users', 'projects', 'tasks', etc.)
 * @param idParam Name of the parameter containing the resource ID
 */
export const requireOwnership = (
  entityType: string,
  idParam: string
) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params[idParam];
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let hasAccess = false;

    switch (entityType) {
      case 'users':
        // Users can only access their own data
        hasAccess = (resourceId === userId);
        break;

      case 'projects':
        // Check if user owns the project
        const project = await storage.getProject(resourceId);
        hasAccess = project?.ownerId === userId;
        break;

      case 'tasks':
        // Check if user has access to the task (through project or assignment)
        const task = await storage.getTask(resourceId);
        if (task) {
          // User has access if they are assigned to the task
          if ((task as any).assigneeId === userId) {
            hasAccess = true;
          } else {
            // Or if they own the project containing the task
            const projectOfTask = await storage.getProject((task as any).projectId);
            hasAccess = projectOfTask?.ownerId === userId;
          }
        }
        break;

      case 'workspaces':
        // Check if user is a member of the workspace
        const userRoles = await storage.getUserRoles(userId);
        // For now, allow if user has any workspace membership (simplified)
        hasAccess = true; // Will be refined with proper workspace member check
        break;

      case 'boards':
        // Check if user has access to the board (through project)
        const board = await storage.getBoard(resourceId);
        if (board) {
          const projectOfBoard = await storage.getProject((board as any).projectId);
          hasAccess = projectOfBoard?.ownerId === userId;
        }
        break;

      default:
        // For unknown entity types, deny access
        hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied: insufficient permissions" });
    }

    next();
  } catch (error) {
    console.error("Ownership check error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Specific ownership middlewares for common entities
export const requireUserOwnership = requireOwnership('users', 'userId');
export const requireProjectOwnership = requireOwnership('projects', 'projectId');
export const requireTaskOwnership = requireOwnership('tasks', 'taskId');
export const requireWorkspaceOwnership = requireOwnership('workspaces', 'workspaceId');
export const requireBoardOwnership = requireOwnership('boards', 'boardId');
