import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../socket/socket';

/**
 * useSocket - connects to socket on mount, auto-cleans up on unmount.
 * @param {string} event - socket event name to listen to
 * @param {function} handler - callback when event fires
 */
const useSocket = (event, handler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = connectSocket();
    const cb = (...args) => handlerRef.current(...args);
    socket.on(event, cb);
    return () => socket.off(event, cb);
  }, [event]);
};

export default useSocket;
