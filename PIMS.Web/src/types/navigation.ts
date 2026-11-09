import { type LucideIcon } from 'lucide-react';

export interface NavSubItem {
  id: string;
  title: string;
  path: string;
  permission?: string;
  description?: string;
}

export interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
  badge?: string;
  description?: string;
  children?: NavSubItem[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}
