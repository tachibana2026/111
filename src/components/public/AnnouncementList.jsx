'use client';

import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, ChevronDown, ChevronUp } from 'lucide-react';

export default function AnnouncementList({ initialData }) {
  const [expandedId, setExpandedId] = useState(null);

  const renderWithLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all font-medium">
          {part}
        </a>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    );
  };

  return (
    <div className="divide-y divide-slate-50">
      <AnimatePresence>
        {initialData.length > 0 ? (
          initialData.map((news) => (
            <div key={news.id} className="relative">
              <div
                onClick={() => setExpandedId(expandedId === news.id ? null : news.id)}
                className={`px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors ${expandedId === news.id ? 'bg-slate-50/50' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {news.is_pinned && (
                        <span className="px-1.5 py-0.5 rounded bg-brand-600 text-white text-[9px] font-black uppercase tracking-tighter">
                          重要
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-bold font-mono">
                        {news.date.replace(/-/g, '.')}
                      </span>
                    </div>
                    <h3 className={`text-base font-bold truncate ${expandedId === news.id ? 'text-brand-700' : 'text-slate-800'}`}>
                      {news.title}
                    </h3>
                  </div>
                  <div className="shrink-0 text-slate-300">
                    {expandedId === news.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === news.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {renderWithLinks(news.content)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-300 font-bold italic">
            現在、新しいお知らせはありません。
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
