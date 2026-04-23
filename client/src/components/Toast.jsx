import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

const Toast = ({ message, type, onClose, duration = 3000 }) => {
    const onCloseRef = React.useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => {
            onCloseRef.current();
        }, duration);
        return () => clearTimeout(timer);
    }, [message, duration]);

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    onClick={onClose}
                    className="fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[10000] max-w-sm mx-auto cursor-pointer"
                >
                    <div
                        className={`flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-3xl border shadow-2xl backdrop-blur-xl transition-colors ${
                            type === "error"
                                ? "bg-red-500/40 border-red-500/50"
                                : type === "warning"
                                    ? "bg-yellow-500/40 border-yellow-500/50 text-yellow-500"
                                    : "bg-yellow-400/40 border-yellow-400/50 text-yellow-400"
                        }`}
                    >
                        {/* Icon */}
                        <div
                            className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center ${
                                type === "error"
                                    ? "bg-red-500/40"
                                    : type === "warning"
                                        ? "bg-yellow-500/40"
                                        : "bg-yellow-400/40"
                            }`}
                        >
                            {type === "error" ? (
                                <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                            ) : type === "success" ? (
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                            )}
                        </div>

                        {/* Message */}
                        <div className="flex-1 min-w-0">
                            <p className={`text-[12px] sm:text-[14px] font-black leading-tight tracking-tight uppercase whitespace-normal ${
                                type === "error" ? "text-red-400" : "text-yellow-50"
                            }`}>
                                {message}
                            </p>
                        </div>

                        {/* Enhanced Hit Area Close Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="shrink-0 -mr-1 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center active:scale-75 transition-all text-white/80 hover:text-white"
                            aria-label="Close notification"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
