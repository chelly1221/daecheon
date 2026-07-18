import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { Lang } from '../types';
import AutoText, { useTranslated } from './AutoText';

export interface DetailComment {
  id: string;
  name: string;
  color: string;
  text: string;
  time: string;
  isMe: boolean;
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
  onSend: (text: string) => void;
  onEdit: () => void;
  onClose: () => void;
}

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
  onEdit,
  onClose,
}: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the thread pinned to the latest message (new ones arrive via sync too).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      onClick={onClose}
      style={css(
        'position:fixed;inset:0;background:rgba(10,50,80,.45);z-index:95;display:flex;align-items:flex-end;justify-content:center',
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={css(
          'width:100%;max-width:430px;background:#FFFFFF;border-radius:22px 22px 0 0;padding:18px 16px 20px;display:flex;flex-direction:column;gap:12px;box-shadow:0 -8px 30px rgba(10,50,80,.2);max-height:88vh',
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
          style={css(
            'display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:44vh;min-height:60px;padding:2px 2px 4px',
          )}
        >
          {comments.length === 0 ? (
            <div style={css('text-align:center;color:#9DBDD2;font-size:12.5px;padding:18px 0')}>
              {L.noComments}
            </div>
          ) : (
            comments.map((c) =>
              c.isMe ? (
                <div key={c.id} style={css('display:flex;flex-direction:column;align-items:flex-end;gap:3px')}>
                  <div
                    style={css(
                      'max-width:80%;background:#0B7CD8;color:#FFFFFF;font-size:13.5px;line-height:1.45;padding:9px 13px;border-radius:15px 15px 4px 15px;white-space:pre-wrap;word-break:break-word',
                    )}
                  >
                    {c.text}
                  </div>
                  <TranslatedNote text={c.text} to={lang} />
                  <span style={css('font-size:10.5px;color:#A9C4D8')}>{c.time}</span>
                </div>
              ) : (
                <div key={c.id} style={css('display:flex;flex-direction:column;align-items:flex-start;gap:3px')}>
                  <div style={css('display:flex;align-items:center;gap:6px')}>
                    <span style={css(`width:9px;height:9px;border-radius:50%;background:${c.color};flex:none`)} />
                    <span style={css('font-size:11.5px;font-weight:700;color:#4A6E88')}>{c.name}</span>
                  </div>
                  <div
                    style={css(
                      'max-width:80%;background:#F0F6FB;color:#22597C;font-size:13.5px;line-height:1.45;padding:9px 13px;border-radius:4px 15px 15px 15px;white-space:pre-wrap;word-break:break-word',
                    )}
                  >
                    {c.text}
                  </div>
                  <TranslatedNote text={c.text} to={lang} />
                  <span style={css('font-size:10.5px;color:#A9C4D8;margin-left:15px')}>{c.time}</span>
                </div>
              ),
            )
          )}
        </div>

        {/* Composer */}
        <div style={css('display:flex;align-items:center;gap:8px')}>
          <input
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
    </div>
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
