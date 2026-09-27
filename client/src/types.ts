export interface Evidence {
  id: string;
  title: string;
  description: string;
  source: string;
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: number;
  fromId: string;
  toId: string;
  createdAt: string;
}

export interface GraphState {
  evidence: Evidence[];
  edges: Edge[];
  levels: Record<string, number>;
  levelCount: number;
}

/** 一条冗余连线及其最短替代路径（传递约简分析结果） */
export interface RedundantEdge {
  edgeId: number;
  fromId: string;
  toId: string;
  /** 忽略该连线后，从 fromId 到 toId 的一条最短替代路径（节点 id 序列，含起终点） */
  path: string[];
}

/** 批量瘦身结果：最新全量状态 + 实际移除 / 被跳过的连线 id */
export interface PruneResult extends GraphState {
  pruned: number[];
  skipped: number[];
}

/** 合并失败原因：改接后产生自环 / 有向环 */
export type MergeConflictKind = 'self-loop' | 'cycle';

/** 合并冲突详情：当前图中导致改接失败的真实路径（自环时为两端点） */
export interface MergeConflict {
  kind: MergeConflictKind;
  /** 冲突路径节点序列：自环时为有直接约束的两端点；成环时为导致闭环的一条真实路径 */
  path: string[];
  sourceId: string;
  targetId: string;
}

export interface EvidenceFormValues {
  title: string;
  description: string;
  source: string;
  occurredAt: string | null;
}

/** 顺序确定性查询的判定结论 */
export type OrderRelation = 'a-before-b' | 'b-before-a' | 'unconstrained';

/** 一个方向的见证布局：附加「firstId 必须早于 secondId」约束后的合法拓扑 */
export interface OrderWitness {
  firstId: string;
  secondId: string;
  /** 合法拓扑序（并列节点按创建时间、再按 id 稳定排序） */
  order: string[];
  /** 附加见证约束后的拓扑层级（仅用于临时预览画布布局） */
  levels: Record<string, number>;
  levelCount: number;
}

/** 顺序确定性查询结果 */
export interface OrderQueryResult {
  aId: string;
  bId: string;
  relation: OrderRelation;
  /** relation 为 a-before-b / b-before-a 时：从先到后的一条最短约束路径（含两端点） */
  path: string[] | null;
  /** relation 为 unconstrained 时：双向见证 */
  witnesses: { aFirst: OrderWitness; bFirst: OrderWitness } | null;
}

/** 必经证据分析结果（只读，不写数据库） */
export interface MandatoryQueryResult {
  aId: string;
  bId: string;
  /** A 能否沿现有「必须早于」连线到达 B；不可达时必无必经证据 */
  reachable: boolean;
  /** 所有 A→B 路径共同经过的中间卡片，按约束先后排列（有直接连线时为空） */
  mandatory: string[];
  /** 位于某条 A→B 路径但非必经的中间卡片，各附一条绕开它的真实路径（含起终点） */
  optional: Array<{ id: string; bypass: string[] }>;
}
