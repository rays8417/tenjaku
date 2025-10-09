type Role =
  | "Overview"
  | "Batsmen"
  | "Bowlers"
  | "All-rounders"
  | "Wicketkeepers";

interface RoleTabsProps {
  activeTab: Role;
  onTabChange: (tab: Role) => void;
  className?: string;
}

export default function RoleTabs({
  activeTab,
  onTabChange,
  className = "",
}: RoleTabsProps) {
  const tabs: Role[] = [
    "Overview",
    "Batsmen",
    "Bowlers",
    "All-rounders",
    "Wicketkeepers",
  ];

  return (
    <div className={`border-b border-border ${className}`}>
      <div className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? "text-foreground border-b-2 border-primary"
                : "text-foreground-muted hover:text-foreground border-b-2 border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

