let _emit = null;

const popup = {
  confirm: (opts = {}) => _emit?.({ type: 'confirm', ...opts }),
  info:    (opts = {}) => _emit?.({ type: 'info',    ...opts }),

  _register:   (emit) => { _emit = emit; },
  _unregister: ()     => { _emit = null; },
};

export default popup;
