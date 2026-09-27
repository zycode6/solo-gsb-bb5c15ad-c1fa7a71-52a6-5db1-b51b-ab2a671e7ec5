import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { MandatoryHighlight } from '../App';
import type { GraphState, MandatoryQueryResult } from '../types';

interface MandatoryPanelProps {
  state: GraphState;
  /** 当前在画布上高亮的必经证据 / 绕开路径（再次点击可取消） */
  highlight: MandatoryHighlight | null;
  titleOf: (id: string) => string;
  onHighlight: (h: MandatoryHighlight | null) => void;
}

/**
 * 必经证据分析面板：选定起点 A 与终点 B 后，仅当 A 能沿现有「必须早于」连线到达 B 时，
 * 列出所有 A→B 路径共同经过的中间卡片（必经证据），按约束先后展示并可在画布高亮；
 * 对位于某条路径但并非必经的卡片，可点出一条绕开它的真实路径核对。
 * 分析只读：选定起终点即自动分析，卡片或连线变化后结果自动刷新。
 */
export default function MandatoryPanel(props: MandatoryPanelProps) {
  const { state, titleOf } = props;
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [result, setResult] = useState<MandatoryQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = aId !== '' && bId !== '' && aId !== bId;

  /* 选定起终点后自动分析；图状态（卡片 / 连线）每次变化后自动重新分析，保证结果不过期 */
  useEffect(() => {
    props.onHighlight(null);
    setErr(null);
    if (!valid || !state.evidence.some((e) => e.id === aId) || !state.evidence.some((e) => e.id === bId)) {
      setResult(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .mandatoryQuery(aId, bId)
      .then((r) => {
        if (alive) {
          setResult(r);
          setErr(null);
        }
      })
      .catch((e) => {
        if (alive) {
          setResult(null);
          setErr(e instanceof ApiError ? e.message : '分析失败，请重试');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [state, aId, bId, valid]);

  const mandatoryActive = props.highlight?.kind === 'mandatory';
  const activeBypassSkip = props.highlight?.kind === 'bypass' ? props.highlight.skip : null;
  /** 是否存在 A→B 直接连线（此时必经中间卡片必为空） */
  const hasDirectEdge = valid && state.edges.some((e) => e.fromId === aId && e.toId === bId);

  const toggleMandatory = () => {
    if (!result || !result.reachable) return;
    props.onHighlight(
      mandatoryActive ? null : { kind: 'mandatory', aId: result.aId, bId: result.bId, nodes: result.mandatory },
    );
  };

  const toggleBypass = (o: { id: string; bypass: string[] }) => {
    props.onHighlight(activeBypassSkip === o.id ? null : { kind: 'bypass', path: o.bypass, skip: o.id });
  };

  return (
    <section className="mandatory-panel">
      <div className="mandatory-head">
        <h2>必经证据分析</h2>
        <p className="muted">
          选定起点与终点后，仅当起点能沿现有「必须早于」连线到达终点时，列出所有路径共同经过的中间卡片（必经证据），按约束先后展示并可在画布高亮；对位于某条路径但并非必经的卡片，可点出一条绕开它的真实路径核对。分析只读，卡片或连线变化后结果自动刷新。
        </p>
      </div>
      <div className="mandatory-controls">
        <select value={aId} onChange={(e) => setAId(e.target.value)} aria-label="起点 A">
          <option value="">选择起点 A…</option>
          {state.evidence.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
        <span className="muted">→</span>
        <select value={bId} onChange={(e) => setBId(e.target.value)} aria-label="终点 B">
          <option value="">选择终点 B…</option>
          {state.evidence.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
        {loading && <span className="muted">分析中…</span>}
        {aId !== '' && aId === bId && <span className="muted">请选择两张不同的卡片</span>}
      </div>
      {err && <div className="mandatory-error">⚠ {err}</div>}
      {result && !result.reachable && (
        <div className="mandatory-result">
          <div className="mandatory-verdict">
            <b>{titleOf(result.aId)}</b> 无法沿现有「必须早于」连线到达 <b>{titleOf(result.bId)}</b>
            ：不存在 A→B 路径，因此没有必经证据可言。
          </div>
        </div>
      )}
      {result && result.reachable && (
        <div className="mandatory-result">
          <div className="mandatory-verdict">
            从 <b>{titleOf(result.aId)}</b> 到 <b>{titleOf(result.bId)}</b> 的所有路径共同经过{' '}
            <b>{result.mandatory.length}</b> 张中间卡片
          </div>
          {result.mandatory.length > 0 ? (
            <>
              <ol className="mandatory-list">
                {result.mandatory.map((id) => (
                  <li key={id}>{titleOf(id)}</li>
                ))}
              </ol>
              <div>
                <button
                  type="button"
                  className={`btn small${mandatoryActive ? ' active' : ''}`}
                  onClick={toggleMandatory}
                  title="在画布上以粉色高亮起点、终点与全部必经中间卡片"
                >
                  {mandatoryActive ? '取消高亮' : '高亮必经证据'}
                </button>
              </div>
            </>
          ) : (
            <div className="muted">
              必经中间卡片为空
              {hasDirectEdge
                ? '：存在从起点到终点的直接连线，一步即可到达，没有任何所有路径共同经过的中间卡片。'
                : '：存在多条没有共同中间卡片的路径。'}
            </div>
          )}
          {result.optional.length > 0 && (
            <div className="mandatory-optional">
              <div className="muted">以下卡片位于某条 A→B 路径上但并非必经，可查看绕开它的真实路径：</div>
              <ul className="optional-list">
                {result.optional.map((o) => {
                  const active = activeBypassSkip === o.id;
                  return (
                    <li key={o.id} className={`optional-item${active ? ' active' : ''}`}>
                      <div className="optional-row">
                        <span className="optional-name">{titleOf(o.id)}</span>
                        <button
                          type="button"
                          className={`btn small${active ? ' active' : ''}`}
                          onClick={() => toggleBypass(o)}
                          title="在画布上以粉色高亮一条绕开该卡片的真实 A→B 路径"
                        >
                          {active ? '取消绕开路径' : '查看绕开路径'}
                        </button>
                      </div>
                      {active && <div className="optional-bypass">绕开路径：{o.bypass.map(titleOf).join(' → ')}</div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
