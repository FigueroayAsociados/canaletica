'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
  }
>(({ className, defaultValue, value, onValueChange, ...props }, ref) => {
  const [selectedTab, setSelectedTab] = React.useState(value || defaultValue || '');

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedTab(value);
    }
  }, [value]);

  const contextValue = React.useMemo(() => {
    return {
      selectedTab,
      setSelectedTab: (value: string) => {
        setSelectedTab(value);
        onValueChange?.(value);
      }
    };
  }, [selectedTab, onValueChange]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={cn('space-y-2', className)}
        {...props}
      />
    </TabsContext.Provider>
  );
});

Tabs.displayName = 'Tabs';

const TabsContext = React.createContext<{
  selectedTab: string;
  setSelectedTab: (value: string) => void;
}>({
  selectedTab: '',
  setSelectedTab: () => {}
});

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within a Tabs component');
  }
  return context;
}

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500',
      className
    )}
    {...props}
  />
));

TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
  }
>(({ className, value, ...props }, ref) => {
  const { selectedTab, setSelectedTab } = useTabsContext();
  const isActive = selectedTab === value;

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive ? 'bg-white text-gray-950 shadow-sm' : 'hover:text-gray-900',
        className
      )}
      onClick={() => setSelectedTab(value)}
      data-state={isActive ? 'active' : 'inactive'}
      {...props}
    />
  );
});

TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string;
  }
>(({ className, value, ...props }, ref) => {
  const { selectedTab } = useTabsContext();
  const isActive = selectedTab === value;

  if (!isActive) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2',
        className
      )}
      data-state={isActive ? 'active' : 'inactive'}
      {...props}
    />
  );
});

TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };