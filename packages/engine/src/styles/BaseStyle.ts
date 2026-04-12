import type { BladeStyle, RGB, StyleContext } from '../types.js';

export abstract class BaseStyle implements BladeStyle {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract getColor(position: number, time: number, context: StyleContext): RGB;
}
