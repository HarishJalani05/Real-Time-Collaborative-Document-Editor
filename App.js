import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import './App.css';

const SAVE_INTERVAL_MS = 2000;

const App = () => {
  const [socket, setSocket] = useState();
  const wrapperRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    const s = io('http://localhost:3002');
    setSocket(s);

    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (wrapperRef.current == null || quillRef.current != null) return;

    const editor = document.createElement('div');
    wrapperRef.current.append(editor);

    const q = new Quill(editor, {
      theme: 'snow',
    });

    q.disable();
    q.setText('Loading...');
    quillRef.current = q;
  }, []);

  useEffect(() => {
    if (!socket || !quillRef.current) return;

    socket.once('load-document', (document) => {
      quillRef.current.setContents(document);
      quillRef.current.enable();
    });

    socket.emit('get-document', 'document-id-1');
  }, [socket]);

  useEffect(() => {
    if (!socket || !quillRef.current) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', delta);
    };

    const q = quillRef.current;
    q.on('text-change', handler);

    return () => q.off('text-change', handler);
  }, [socket]);

  useEffect(() => {
    if (!socket || !quillRef.current) return;

    const handler = (delta) => {
      quillRef.current.updateContents(delta);
    };

    socket.on('receive-changes', handler);

    return () => socket.off('receive-changes', handler);
  }, [socket]);

  useEffect(() => {
    if (!socket || !quillRef.current) return;

    const interval = setInterval(() => {
      socket.emit('save-document', quillRef.current.getContents());
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [socket]);

  return <div className="container" ref={wrapperRef}></div>;
};

export default App;