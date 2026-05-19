import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      resetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return {
        error: null,
        resetKey: props.resetKey,
      };
    }
    return null;
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 max-w-xl">
          <p className="text-sm uppercase tracking-wide text-yellow-500 mb-2">
            Something interrupted this view
          </p>
          <h1 className="text-2xl font-bold mb-3">Try reloading the section.</h1>
          <p className="text-zinc-300 mb-6">
            The movie data layer will keep serving cached or fallback results while
            the live provider recovers.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="bg-yellow-500 text-black px-5 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
