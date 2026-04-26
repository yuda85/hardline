import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { MuscleBodyComponent } from './muscle-body';
import { MuscleGroup } from '../../../core/models/workout.model';

function setup() {
  TestBed.configureTestingModule({ imports: [MuscleBodyComponent] });
  return TestBed.createComponent(MuscleBodyComponent);
}

function host(fixture: ReturnType<typeof setup>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function fillsOf(fixture: ReturnType<typeof setup>): string[] {
  return Array.from(host(fixture).querySelectorAll('polygon')).map(
    p => (p as SVGPolygonElement).style.fill || '',
  );
}

describe('MuscleBodyComponent', () => {
  it('renders a single side by default (auto, no highlights)', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(host(fixture).querySelectorAll('svg').length).toBe(1);
  });

  it('renders both sides when view is "both"', () => {
    const fixture = setup();
    fixture.componentRef.setInput('view', 'both');
    fixture.detectChanges();
    expect(host(fixture).querySelectorAll('svg').length).toBe(2);
  });

  it('picks the posterior side automatically for back muscles', () => {
    const fixture = setup();
    fixture.componentRef.setInput('highlighted', [MuscleGroup.Back]);
    fixture.detectChanges();
    const points = Array.from(host(fixture).querySelectorAll('polygon')).map(
      p => p.getAttribute('points') ?? '',
    );
    // "50.64 0" is the posterior head polygon's first point; not present in anterior data.
    expect(points.some(p => p.startsWith('50.64 0'))).toBe(true);
  });

  it('highlights the requested group with the muscle color token', () => {
    const fixture = setup();
    fixture.componentRef.setInput('highlighted', [MuscleGroup.Chest]);
    fixture.componentRef.setInput('view', 'anterior');
    fixture.detectChanges();
    expect(fillsOf(fixture).some(f => f.includes('--muscle-chest'))).toBe(true);
  });

  it('FullBody causes both sides to render with all groups highlighted', () => {
    const fixture = setup();
    fixture.componentRef.setInput('highlighted', [MuscleGroup.FullBody]);
    fixture.detectChanges();
    expect(host(fixture).querySelectorAll('svg').length).toBe(2);
    expect(fillsOf(fixture).some(f => f.includes('--muscle-'))).toBe(true);
  });

  it('respects a custom colorFn override (used by recovery-map)', () => {
    const fixture = setup();
    fixture.componentRef.setInput('highlighted', [MuscleGroup.Chest]);
    fixture.componentRef.setInput('view', 'anterior');
    fixture.componentRef.setInput('colorFn', () => '#ff0000');
    fixture.detectChanges();
    const fills = fillsOf(fixture).map(f => f.replace(/\s/g, '').toLowerCase());
    expect(fills.some(f => f === '#ff0000' || f.includes('rgb(255,0,0)'))).toBe(true);
  });

  it('exposes an aria-label listing the targeted groups', () => {
    const fixture = setup();
    fixture.componentRef.setInput('highlighted', [MuscleGroup.Chest, MuscleGroup.Triceps]);
    fixture.detectChanges();
    expect(host(fixture).getAttribute('aria-label')).toBe('Targets: Chest, Triceps');
  });
});
