import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ProjectsContextType {
  selectedWorkspaceId: string | null;
  activeProjectId: string | null;
  activeBoardId: string | null;
  collapsedProjects: Record<string, boolean>;
  isLoading: boolean;
  handleWorkspaceChange: (id: string | null) => void;
  handleProjectChange: (id: string | null) => void;
  handleBoardChange: (id: string | null) => void;
  handleCollapsedProjectsChange: (collapsed: Record<string, boolean>) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Состояние UI
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Загрузка текущего пользователя
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });

  // Загрузка настроек пользователя
  const { data: userSettings = [], isLoading: isLoadingSettings } = useQuery<any[]>({
    queryKey: ["/api/user/settings"],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 минут
  });

  // Преобразование настроек в объект
  const settingsMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    if (userSettings && Array.isArray(userSettings)) {
      userSettings.forEach((s: any) => {
        if (s?.key) {
          map[s.key] = s.value;
        }
      });
    }
    return map;
  }, [userSettings]);

  // Загрузка настроек при монтировании или смене пользователя
  useEffect(() => {
    console.log("[ProjectsProvider] useEffect triggered", {
      user_id: user?.id,
      isInitialized,
      isLoadingSettings,
      userSettingsLength: userSettings?.length,
      settingsMap,
    });

    if (!user?.id) {
      // Сброс при выходе
      console.log("[ProjectsProvider] User logged out, resetting state");
      setSelectedWorkspaceId(null);
      setActiveProjectId(null);
      setActiveBoardId(null);
      setCollapsedProjects({});
      setIsInitialized(false);
      return;
    }

    if (!isInitialized && !isLoadingSettings) {
      console.log("[ProjectsProvider] Loading settings from server");
      // Загружаем настройки, если они есть
      if (settingsMap.selectedWorkspaceId !== undefined) {
        setSelectedWorkspaceId(settingsMap.selectedWorkspaceId);
      }
      if (settingsMap.activeProjectId !== undefined) {
        setActiveProjectId(settingsMap.activeProjectId);
      }
      if (settingsMap.activeBoardId !== undefined) {
        setActiveBoardId(settingsMap.activeBoardId);
      }
      if (settingsMap.collapsedProjects !== undefined) {
        setCollapsedProjects(settingsMap.collapsedProjects);
      }
      setIsInitialized(true);
      console.log("[ProjectsProvider] Settings loaded", {
        selectedWorkspaceId,
        activeProjectId,
        activeBoardId,
      });
    }
  }, [user?.id, isInitialized, isLoadingSettings, settingsMap]);

  // Мутация для сохранения настроек
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      await apiRequest("PUT", "/api/user/settings", { key, value });
    },
    onError: (error) => {
      console.error("Failed to save setting:", error);
    }
  });

  // Хендлеры с сохранением в настройки
  const handleWorkspaceChange = useCallback((workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId);
    updateSettingMutation.mutate({ key: 'selectedWorkspaceId', value: workspaceId });
  }, [updateSettingMutation]);

  const handleProjectChange = useCallback((projectId: string | null) => {
    setActiveProjectId(projectId);
    updateSettingMutation.mutate({ key: 'activeProjectId', value: projectId });
  }, [updateSettingMutation]);

  const handleBoardChange = useCallback((boardId: string | null) => {
    setActiveBoardId(boardId);
    updateSettingMutation.mutate({ key: 'activeBoardId', value: boardId });
  }, [updateSettingMutation]);

  const handleCollapsedProjectsChange = useCallback((collapsed: Record<string, boolean>) => {
    setCollapsedProjects(collapsed);
    updateSettingMutation.mutate({ key: 'collapsedProjects', value: collapsed });
  }, [updateSettingMutation]);

  const value: ProjectsContextType = {
    selectedWorkspaceId,
    activeProjectId,
    activeBoardId,
    collapsedProjects,
    isLoading: isLoadingSettings || !isInitialized,
    handleWorkspaceChange,
    handleProjectChange,
    handleBoardChange,
    handleCollapsedProjectsChange,
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
};

export const useProjectsContext = (): ProjectsContextType => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjectsContext must be used within ProjectsProvider');
  }
  return context;
};
