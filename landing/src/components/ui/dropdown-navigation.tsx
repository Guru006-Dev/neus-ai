import { useState } from "react";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

export type NavItem = {
  id: number;
  label: string;
  subMenus?: {
    title: string;
    items: {
      label: string;
      description: string;
      icon: React.ElementType;
    }[];
  }[];
  link?: string;
};

type Props = {
  navItems: NavItem[];
  activeItem?: string;
  onItemClick?: (label: string) => void;
};

export function DropdownNavigation({ navItems, activeItem, onItemClick }: Props) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [isHover, setIsHover] = useState<number | null>(null);

  const handleHover = (menuLabel: string | null) => {
    setOpenMenu(menuLabel);
  };

  return (
    <ul className="relative flex items-center gap-2">
      {navItems.map((navItem) => {
        const isActive = activeItem === navItem.label;
        return (
        <li
          key={navItem.label}
          className="relative"
          onMouseEnter={() => handleHover(navItem.label)}
          onMouseLeave={() => handleHover(null)}
        >
          <button
            onClick={() => onItemClick?.(navItem.label)}
            className="text-xs py-2 px-4 flex cursor-pointer group transition-colors duration-300 items-center justify-center gap-1.5 relative"
            style={{
              color: isActive ? 'var(--color-primary)' : undefined,
              fontFamily: 'var(--font-family-label)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={() => setIsHover(navItem.id)}
            onMouseLeave={() => setIsHover(null)}
          >
            <span className={isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
              {navItem.label}
            </span>
            {navItem.subMenus && (
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-300
                  ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}
                  ${openMenu === navItem.label ? "rotate-180" : ""}`}
              />
            )}
            {(isHover === navItem.id || openMenu === navItem.label || isActive) && (
              <motion.div
                layoutId="hover-bg"
                className="absolute left-4 right-4 bottom-0"
                style={{ height: 2, background: 'var(--color-primary)' }}
              />
            )}
          </button>

          <AnimatePresence>
            {openMenu === navItem.label && navItem.subMenus && (
              <div className="w-auto absolute left-0 top-full pt-2" style={{ zIndex: 200 }}>
                <motion.div
                  className="bg-background border border-border p-5 w-max"
                  style={{ borderRadius: 2 }}
                  layoutId="menu"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="w-fit shrink-0 flex space-x-8 overflow-hidden">
                    {navItem.subMenus.map((sub) => (
                      <motion.div layout className="w-full min-w-[160px]" key={sub.title}>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-2" style={{ fontFamily: 'var(--font-family-label)' }}>
                          {sub.title}
                        </h3>
                        <ul className="space-y-1">
                          {sub.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <li key={item.label}>
                                <a href="#" className="flex items-center gap-3 group py-2.5 px-2.5 rounded-none hover:bg-accent/40 transition-colors duration-200">
                                  <div className="border border-border text-foreground rounded-none flex items-center justify-center w-9 h-9 shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
                                    <Icon className="h-4 w-4 flex-none" />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-medium text-foreground leading-none">
                                      {item.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300 leading-snug">
                                      {item.description}
                                    </p>
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </li>
        );
      })}
    </ul>
  );
}
