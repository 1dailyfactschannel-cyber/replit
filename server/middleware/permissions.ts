import { Request, Response, NextFunction } from 'express';
import { getStorage } from '../postgres-storage';

type Permission = string;

export function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    try {
      const storage = getStorage();
      const hasAll = await Promise.all(
        permissions.map(p => storage.hasPermission(req.user!.id, p))
      );

      if (!hasAll.every(Boolean)) {
        return res.status(403).json({ message: 'Недостаточно прав' });
      }

      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      return res.status(500).json({ message: 'Ошибка проверки прав' });
    }
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    try {
      const storage = getStorage();
      const hasAny = await Promise.all(
        permissions.map(p => storage.hasPermission(req.user!.id, p))
      );

      if (!hasAny.some(Boolean)) {
        return res.status(403).json({ message: 'Недостаточно прав' });
      }

      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      return res.status(500).json({ message: 'Ошибка проверки прав' });
    }
  };
}

export function requireObjectPermission(objectType: string, permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    try {
      const storage = getStorage();
      const objectId = req.params.id || req.body[`${objectType}Id`];
      
      if (!objectId) {
        return res.status(400).json({ message: 'ID объекта не указан' });
      }

      // Check if object is hidden for user
      const isHidden = await storage.isObjectHidden(req.user!.id, objectType, objectId);
      if (isHidden) {
        return res.status(403).json({ message: 'Объект скрыт' });
      }

      // Check permission
      const hasPermission = await storage.hasPermission(req.user!.id, permission);
      if (!hasPermission) {
        return res.status(403).json({ message: 'Нет доступа к объекту' });
      }

      next();
    } catch (error) {
      console.error('Error checking object permissions:', error);
      return res.status(500).json({ message: 'Ошибка проверки прав' });
    }
  };
}
