import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { Lang } from '../types';
import AutoText, { useTranslated } from './AutoText';

/** The quoted parent shown above a reply bubble. */
export interface ReplyQuote {
  name: string;
  text: string;
  color: string;
  deleted: boolean;
}

export interface DetailComment {
  id: string;
  name: string;
  color: string;
  text: string;
  time: string;
  isMe: boolean;
  replyTo?: string;
  parent?: ReplyQuote | null;
}

interface Props {
  L: UIStrings;
  lang: Lang;
  title: string;
  typeLabel: string; // e.g. food category chip; '' to hide
  meta: string; // desc / memo; '' to hide
  link: string;
  linkShow: boolean;
  comments: DetailComment[];
  onSend: (text: string, replyTo?: string) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  onClose: () => void;
}

type MenuState = {
  id: string;
  x: number;
  y: number;
  canDelete: boolean;
  name: string;
  text: string;
} | null;

type ReplyState = { id: string; name: string; text: string } | null;

export default function ItemDetail({
  L,
  lang,
  title,
  typeLabel,
  meta,
  link,
  linkShow,
  comments,
  onSend,
  onDelete,
  onEdit,
  onClose,
}: Props) {
  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState<MenuState>(null);
  const [reply, setReply] = useState<ReplyState>(null);
  const [toast, setToast] = useState('');
  const [flashId, setFlashId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const atBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const openedAtRef = useRef(0);

  const onThreadScroll = () => {
    const el = listRef.current;
    if (el) atBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
  };

  // Pin to the latest message only when the reader is already at the bottom, so
  // an incoming message or a deletion (which shrinks the list) never yanks the
  // view of someone scrolled up reading earlier messages.
  useEffect(() => {
    const el = listRef.current;
    const prev = prevLenRef.current;
    prevLenRef.current = comments.length;
    if (el && comments.length > prev && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  // Auto-clear the transient copy confirmation.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  // Fade out the scroll-to-parent highlight.
  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), 1200);
    return () => clearTimeout(t);
  }, [flashId]);

  const registerRef = (id: string, el: HTMLDivElement | null) => {
    const m = rowRefs.current;
    if (el) m.set(id, el);
    else m.delete(id);
  };

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t, reply?.id);
    setDraft('');
    setReply(null);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  const startReply = () => {
    if (!menu) return;
    setReply({ id: menu.id, name: menu.name, text: menu.text });
    setMenu(null);
    // Focus synchronously within the tap's gesture stack — the composer input is
    // always mounted, and deferring (rAF/timeout) would stop iOS from raising
    // the soft keyboard.
    inputRef.current?.focus();
  };
  const copyText = async () => {
    const text = menu?.text ?? '';
    setMenu(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setToast(L.copied);
    } catch {
      /* ignore */
    }
  };
  const doDelete = () => {
    if (!menu) return;
    const { id } = menu;
    setMenu(null);
    if (reply?.id === id) setReply(null);
    onDelete(id);
  };

  const scrollToParent = (pid: string) => {
    const el = rowRefs.current.get(pid);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFlashId(pid);
  };

  const openMenu = (m: MenuState) => {
    openedAtRef.current = Date.now();
    setMenu(m);
  };
  // The long-press timer opens the menu while the finger is still down, so the
  // gesture's own release (a synthesized click on the freshly-mounted backdrop)
  // would otherwise dismiss it instantly. Ignore any close within a short window
  // of opening; a real outside tap comes later and still closes it.
  const closeMenu = () => {
    if (Date.now() - openedAtRef.current < 350) return;
    setMenu(null);
  };

  return (
    <div
      onClick={() => {
        // A stray click from opening the long-press menu (its target can resolve
        // to this overlay root) must not close the whole sheet.
        if (menu) return;
        onClose();
      }}
      style={css(
        'position:fixed;inset:0;background:rgba(10,50,80,.45);z-index:95;display:flex;align-items:flex-end;justify-content:center',
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={css(
          'position:relative;width:100%;max-width:430px;background:#FFFFFF;border-radius:22px 22px 0 0;padding:18px 16px 20px;display:flex;flex-direction:column;gap:12px;box-shadow:0 -8px 30px rgba(10,50,80,.2);max-height:88vh',
        )}
      >
        {/* Header: title + close */}
        <div style={css('display:flex;align-items:flex-start;justify-content:space-between;gap:8px')}>
          <div style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:5px')}>
            <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
              <span style={css("font-family:'Jua',sans-serif;font-size:18px;color:#164A6B;line-height:1.25")}>
                <AutoText text={title} to={lang} />
              </span>
              {!!typeLabel && (
                <span
                  style={css(
                    'background:#E7F7F1;color:#1D9E7A;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px',
                  )}
                >
                  {typeLabel}
                </span>
              )}
              {linkShow && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener"
                  style={css(
                    'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#EAF4FC;border:1px solid #C9E2F4;font-size:11px;text-decoration:none',
                  )}
                >
                  🔗
                </a>
              )}
            </div>
            {!!meta && (
              <div style={css('font-size:12.5px;color:#5A7D96;line-height:1.5')}>
                <AutoText text={meta} to={lang} />
              </div>
            )}
          </div>
          <button
            onClick={onEdit}
            style={css(
              "flex:none;display:inline-flex;align-items:center;gap:4px;min-height:34px;padding:0 13px;border-radius:999px;border:1.5px solid #CFE6F6;background:#F2F9FE;color:#0B7CD8;font-family:'Jua',sans-serif;font-size:13px",
            )}
          >
            <span style={css("font-family:'Material Symbols Rounded';font-size:16px;line-height:1")}>
              edit
            </span>
            {L.edit}
          </button>
          <button
            onClick={onClose}
            style={css(
              'flex:none;width:32px;height:32px;border-radius:50%;border:none;background:#EFF6FB;color:#6B8BA3;font-size:14px;font-weight:700;padding:0',
            )}
          >
            ✕
          </button>
        </div>

        <div style={css('height:1px;background:#EAF2F8')} />

        {/* Comments label */}
        <div style={css('display:flex;align-items:center;gap:6px')}>
          <span style={css("font-family:'Material Symbols Rounded';font-size:18px;color:#0B7CD8")}>
            chat_bubble
          </span>
          <span style={css('font-size:13.5px;font-weight:700;color:#22597C')}>{L.comments}</span>
          {comments.length > 0 && (
            <span style={css('font-size:12px;color:#8FAEC4;font-weight:600')}>{comments.length}</span>
          )}
        </div>

        {/* Thread */}
        <div
          ref={listRef}
          onScroll={onThreadScroll}
          style={css(
            'display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:44vh;min-height:60px;padding:2px 2px 4px',
          )}
        >
          {comments.length === 0 ? (
            <div style={css('text-align:center;color:#9DBDD2;font-size:12.5px;padding:18px 0')}>
              {L.noComments}
            </div>
          ) : (
            comments.map((c) => (
              <MessageBubble
                key={c.id}
                c={c}
                lang={lang}
                L={L}
                flash={flashId === c.id}
                registerRef={registerRef}
                onQuoteTap={scrollToParent}
                onOpenMenu={openMenu}
              />
            ))
          )}
        </div>

        {/* Composer (with optional reply banner) */}
        <div style={css('display:flex;flex-direction:column;gap:8px')}>
          {reply && (
            <div
              style={css(
                'display:flex;align-items:center;gap:9px;background:#EEF6FC;border:1px solid #DCEAF4;border-radius:12px;padding:7px 8px 7px 11px',
              )}
            >
              <span
                style={css(
                  "font-family:'Material Symbols Rounded';font-size:17px;color:#0B7CD8;line-height:1;flex:none",
                )}
              >
                reply
              </span>
              <div style={css('flex:1;min-width:0')}>
                <div style={css('font-size:11px;font-weight:700;color:#3E6A8C')}>
                  {L.reply} · {reply.name}
                </div>
                <div
                  style={css(
                    'font-size:11.5px;color:#6E8CA3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
                  )}
                >
                  {reply.text}
                </div>
              </div>
              <button
                onClick={() => setReply(null)}
                aria-label="cancel reply"
                style={css(
                  'flex:none;width:26px;height:26px;border-radius:50%;border:none;background:#DCEAF4;color:#5A7D96;font-size:13px;font-weight:700;padding:0',
                )}
              >
                ✕
              </button>
            </div>
          )}
          <div style={css('display:flex;align-items:center;gap:8px')}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder={L.commentPh}
              style={css(
                'flex:1;min-height:46px;border:1px solid #D5E7F3;border-radius:999px;padding:0 16px;font-size:14px;background:#F7FCFF;outline:none;color:#22597C',
              )}
            />
            <button
              onClick={send}
              aria-label="send"
              style={css(
                'flex:none;width:46px;height:46px;border-radius:50%;border:none;background:#0B7CD8;color:#FFFFFF;display:flex;align-items:center;justify-content:center;padding:0',
              )}
            >
              <span style={css("font-family:'Material Symbols Rounded';font-size:20px;line-height:1")}>
                send
              </span>
            </button>
          </div>
        </div>

        {toast && (
          <div
            style={css(
              'position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:130;background:rgba(22,74,107,.92);color:#FFFFFF;font-size:12.5px;font-weight:600;padding:8px 15px;border-radius:999px;box-shadow:0 4px 14px rgba(10,50,80,.25)',
            )}
          >
            {toast}
          </div>
        )}
      </div>

      {menu && (
        <MessageMenu
          menu={menu}
          L={L}
          onReply={startReply}
          onCopy={copyText}
          onDelete={doDelete}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

/** One message row: name (for others), bubble with long-press menu, translated echo, time. */
function MessageBubble({
  c,
  lang,
  L,
  flash,
  registerRef,
  onQuoteTap,
  onOpenMenu,
}: {
  c: DetailComment;
  lang: Lang;
  L: UIStrings;
  flash: boolean;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  onQuoteTap: (parentId: string) => void;
  onOpenMenu: (m: MenuState) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const startRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const openedRef = useRef(false);

  const open = (x: number, y: number) =>
    onOpenMenu({ id: c.id, x, y, canDelete: c.isMe, name: c.name, text: c.text });

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };
  const onPointerDown = (e: PointerEvent) => {
    // Reset per-gesture flags first, before the right-click bail-out, so every
    // fresh gesture (including a repeat right-click, which is handled entirely
    // by onContextMenu) starts clean and the menu can reopen.
    movedRef.current = false;
    openedRef.current = false;
    // Left button / touch / pen start a hold timer; right-click goes via contextmenu.
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    clear();
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        openedRef.current = true;
        open(startRef.current.x, startRef.current.y);
      }
    }, 470);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = Math.abs(e.clientX - startRef.current.x) + Math.abs(e.clientY - startRef.current.y);
    if (d > 12) {
      movedRef.current = true;
      clear();
    }
  };
  const onContextMenu = (e: MouseEvent) => {
    // Kill the native long-press/right-click menu; open ours unless the hold
    // timer already did (mobile fires contextmenu right after our timer).
    e.preventDefault();
    clear();
    if (openedRef.current) return;
    openedRef.current = true;
    open(e.clientX, e.clientY);
  };

  const bubbleBase = c.isMe
    ? 'max-width:80%;background:#0B7CD8;color:#FFFFFF;font-size:13.5px;line-height:1.45;padding:9px 13px;border-radius:15px 15px 4px 15px;white-space:pre-wrap;word-break:break-word;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:default'
    : 'max-width:80%;background:#F0F6FB;color:#22597C;font-size:13.5px;line-height:1.45;padding:9px 13px;border-radius:4px 15px 15px 15px;white-space:pre-wrap;word-break:break-word;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:default';
  const bubbleStyle = css(bubbleBase);
  if (flash) {
    bubbleStyle.boxShadow = c.isMe ? '0 0 0 3px rgba(11,124,216,.35)' : '0 0 0 3px rgba(11,124,216,.28)';
    bubbleStyle.transition = 'box-shadow .2s';
  }

  return (
    <div
      ref={(el) => registerRef(c.id, el)}
      style={css(
        `display:flex;flex-direction:column;gap:3px;align-items:${c.isMe ? 'flex-end' : 'flex-start'}`,
      )}
    >
      {!c.isMe && (
        <div style={css('display:flex;align-items:center;gap:6px')}>
          <span style={css(`width:9px;height:9px;border-radius:50%;background:${c.color};flex:none`)} />
          <span style={css('font-size:11.5px;font-weight:700;color:#4A6E88')}>{c.name}</span>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={clear}
        onPointerCancel={clear}
        onPointerLeave={clear}
        onContextMenu={onContextMenu}
        style={bubbleStyle}
      >
        {c.parent && (
          <ReplyQuoteBlock
            parent={c.parent}
            isMe={c.isMe}
            L={L}
            onTap={() => c.replyTo && onQuoteTap(c.replyTo)}
          />
        )}
        {c.text}
      </div>
      <TranslatedNote text={c.text} to={lang} />
      <span
        style={css(
          c.isMe ? 'font-size:10.5px;color:#A9C4D8' : 'font-size:10.5px;color:#A9C4D8;margin-left:15px',
        )}
      >
        {c.time}
      </span>
    </div>
  );
}

/** The quoted parent shown at the top of a reply bubble; tap to jump to it. */
function ReplyQuoteBlock({
  parent,
  isMe,
  L,
  onTap,
}: {
  parent: ReplyQuote;
  isMe: boolean;
  L: UIStrings;
  onTap: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      style={css(
        `display:flex;flex-direction:column;gap:1px;margin-bottom:5px;padding:4px 9px;border-radius:7px;border-left:3px solid ${parent.color};max-width:100%;cursor:pointer;background:${
          isMe ? 'rgba(255,255,255,.16)' : 'rgba(11,124,216,.06)'
        }`,
      )}
    >
      {!parent.deleted && !!parent.name && (
        <span
          style={css(
            `font-size:10.5px;font-weight:700;line-height:1.3;color:${isMe ? '#EAF4FF' : parent.color}`,
          )}
        >
          {parent.name}
        </span>
      )}
      <span
        style={css(
          `font-size:11.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${
            parent.deleted ? 'font-style:italic;' : ''
          }color:${isMe ? 'rgba(255,255,255,.82)' : '#6E8CA3'}`,
        )}
      >
        {parent.deleted ? L.deletedMsg : parent.text}
      </span>
    </div>
  );
}

/** Anchored long-press action menu: reply, copy, and (own messages) delete. */
function MessageMenu({
  menu,
  L,
  onReply,
  onCopy,
  onDelete,
  onClose,
}: {
  menu: NonNullable<MenuState>;
  L: UIStrings;
  onReply: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const W = 168;
  const rows = menu.canDelete ? 3 : 2;
  const H = rows * 44 + 10;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 430;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const left = clamp(menu.x - W / 2, 8, vw - W - 8);
  const top = clamp(menu.y + 8, 8, vh - H - 8);

  const item = (icon: string, label: string, onTap: () => void, danger?: boolean) => (
    <button
      onClick={onTap}
      style={css(
        `display:flex;align-items:center;gap:11px;width:100%;min-height:44px;padding:0 15px;border:none;background:transparent;font-size:14px;text-align:left;color:${
          danger ? '#E8503A' : '#22597C'
        }`,
      )}
    >
      <span
        style={css(
          `font-family:'Material Symbols Rounded';font-size:19px;line-height:1;color:${
            danger ? '#E8503A' : '#5A88A8'
          }`,
        )}
      >
        {icon}
      </span>
      {label}
    </button>
  );

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        style={css('position:fixed;inset:0;z-index:120;background:transparent')}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={css(
          `position:fixed;left:${left}px;top:${top}px;z-index:121;width:${W}px;background:#FFFFFF;border-radius:14px;padding:5px 0;box-shadow:0 8px 26px rgba(10,50,80,.28);border:1px solid #E6EFF6;overflow:hidden`,
        )}
      >
        {item('reply', L.reply, onReply)}
        {item('content_copy', L.copy, onCopy)}
        {menu.canDelete && item('delete', L.del, onDelete, true)}
      </div>
    </>
  );
}

/**
 * A muted, machine-translated echo of a chat message, shown beneath the bubble
 * only when the message is written in the other language. Renders nothing while
 * the translation is pending or when none is needed.
 */
function TranslatedNote({ text, to }: { text: string; to: Lang }) {
  const tr = useTranslated(text, to);
  if (tr === text) return null;
  return (
    <div style={css('display:flex;align-items:flex-start;gap:4px;max-width:80%')}>
      <span
        style={css(
          "font-family:'Material Symbols Rounded';font-size:13px;color:#9DBBD0;line-height:1.5;flex:none",
        )}
      >
        translate
      </span>
      <span style={css('font-size:11.5px;color:#8AA9C0;line-height:1.5')}>{tr}</span>
    </div>
  );
}
