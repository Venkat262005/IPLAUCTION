import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

const Toast = ({ message, type, onClose, duration = 5000 }) => {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    onClick={onClose}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[94%] sm:w-[calc(100%-1.5rem)] max-w-sm cursor-pointer"
                >
                    <div
                        className={`flex items-center gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-colors ${
                            type === "error"
                                ? "bg-red-500/40 border-red-500/50"
                                : type === "warning"
                                    ? "bg-yellow-500/40 border-yellow-500/50 text-yellow-500"
                                    : "bg-yellow-400/40 border-yellow-400/50 text-yellow-400"
                        }`}
                    >
                        {/* Icon */}
                        <div
                            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                type === "error"
                                    ? "bg-red-500/40"
                                    : type === "warning"
                                        ? "bg-yellow-500/40"
                                        : "bg-yellow-400/40"
                            }`}
                        >
                            {type === "error" ? (
                                <X className="w-5 h-5 text-red-500" />
                            ) : type === "success" ? (
                                <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            )}
                        </div>

                        {/* Message */}
                        <div className="flex-1 min-w-0">
                            <p className={`text-[13px] sm:text-sm font-black leading-normal tracking-tight uppercase whitespace-normal ${
                                type === "error" ? "text-red-400" : "text-yellow-50"
                            }`}>
                                {message}
                            </p>
                        </div>

                        {/* Enhanced Hit Area Close Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="shrink-0 -mr-1 w-12 h-12 flex items-center justify-center active:scale-75 transition-all text-white/80 hover:text-white"
                            aria-label="Close notification"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
