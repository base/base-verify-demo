import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, type }])

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 1500)
  }, [])

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: '#f0fdf4',
          border: '#bbf7d0',
          text: '#15803d'
        }
      case 'error':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          text: '#991b1b'
        }
      case 'info':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1e40af'
        }
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'center',
        pointerEvents: 'none',
        width: '100%',
        maxWidth: '400px',
        padding: '0 1rem'
      }}>
        {toasts.map((toast) => {
          const colors = getToastColors(toast.type)
          return (
            <div
              key={toast.id}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                width: '100%',
                pointerEvents: 'auto',
                animation: 'slideUp 0.3s ease-out',
              }}
            >
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: colors.text,
                display: 'block',
                textAlign: 'center',
                lineHeight: '1.4'
              }}>
                {toast.message}
              </span>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

