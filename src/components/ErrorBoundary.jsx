import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Ocurrió un error inesperado en la interfaz.'
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F6F5F1] text-[#121212]">
          <div className="max-w-md w-full rounded-lg border border-[#E5E3DC] bg-white p-6 space-y-3 text-center">
            <h1 className="text-base font-bold">Se produjo un error en la vista</h1>
            <p className="text-xs text-[#666560]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-[#121212] text-white text-xs font-semibold"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
