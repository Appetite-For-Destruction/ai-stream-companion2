module.exports = {
    theme: {
        extend: {
            keyframes: {
                'slide-left': {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(-100%)' }
                }
            },
            animation: {
                'slide-left': 'slide-left 10s linear'
            }
        }
    }
} 