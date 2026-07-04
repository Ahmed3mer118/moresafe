import type { Project } from '../types';

export type BudgetHealth = 'ok' | 'near' | 'over' | 'empty';

export function budgetRatio(spent: number, budget: number) {
  if (!budget || budget <= 0) return 0;
  return spent / budget;
}

export function budgetPercent(spent: number, budget: number) {
  return Math.min(100, Math.round(budgetRatio(spent, budget) * 100));
}

export function budgetHealth(spent: number, budget: number): BudgetHealth {
  if (!budget || budget <= 0) return 'empty';
  const ratio = budgetRatio(spent, budget);
  if (ratio > 1) return 'over';
  if (ratio >= 0.9) return 'near';
  return 'ok';
}

export function budgetBarVariant(health: BudgetHealth): 'green' | 'amber' | 'red' | 'default' {
  if (health === 'over') return 'red';
  if (health === 'near') return 'amber';
  if (health === 'ok') return 'green';
  return 'default';
}

export function summarizeProjects(projects: Project[] = []) {
  let budget = 0;
  let spent = 0;
  let overCount = 0;
  let nearCount = 0;

  for (const p of projects) {
    const b = p.budget || 0;
    const s = p.spent || 0;
    budget += b;
    spent += s;
    const health = budgetHealth(s, b);
    if (health === 'over') overCount += 1;
    else if (health === 'near') nearCount += 1;
  }

  return {
    projectCount: projects.length,
    budget,
    spent,
    remaining: budget - spent,
    overCount,
    nearCount,
  };
}
