import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentState, pushCode, resetToStable, getSource } from './api';
import { textContent } from './data/textContent';
import Hero from './components/Hero';
import EditorSection from './components/EditorSection';
import UsernameInput from './components/UsernameInput';
import ActionButtons from './components/ActionButtons';
import StatusBar from './components/StatusBar';
import NotificationSidebar from './components/NotificationSidebar';

export default function App() {
  const [source, setSource] = useState(textContent.editorContent.editorInitialText);
  const [state, setState] = useState({ state: 'stable', modifiedBy: null, modifiedAt: null });
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const isModified = state.state === 'modified';
  const hasOwnerCookie = document.cookie.split(';').some(c => c.trim().startsWith('owner=true'));
  const canPush = username.trim() !== '';

  const isFirstRun = useRef(true);
  const editorSectionRef = useRef(null);
  const observerRef = useRef(null);

  const addNotification = useCallback((msg, isSuccess = true) => {
    const date = new Date();
    setNotifications(prev => [...prev, {
      nId: `${Date.now()}-${Math.random()}`,
      nTime: `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`,
      nMsg: msg,
      nIsSuccess: isSuccess,
    }]);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [currentState, src] = await Promise.all([
          getCurrentState(),
          getSource(),
        ]);
        setState(currentState);
        setSource(src);
        addNotification(textContent.nortificationContent.codeLoadSuccess);
      } catch (e) {
        console.error('Failed to load', e);
        addNotification(textContent.nortificationContent.codeLoadFail, false);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [addNotification]);

  useEffect(() => {
    const el = editorSectionRef.current;
    if (!el) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setNotifEnabled(true);
            observerRef.current?.unobserve(el);
            observerRef.current?.disconnect();
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 1.0 }
    );

    observerRef.current.observe(el);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
    }
  }, []);

  const scrollToEditor = () => {
    editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  async function handlePush() {
    if (!canPush) {
      addNotification(textContent.nortificationContent.codePushErrorInvalidData, false);
      return;
    }
    try {
      const res = await pushCode(source, username);
      if (res.success) {
        document.cookie = 'owner=true; path=/; max-age=86400; samesite=lax';
        setState(prev => ({ ...prev, state: 'modified', modifiedBy: username }));
        addNotification(textContent.nortificationContent.codePushSuccess);
      }
    } catch (e) {
      console.error('Push failed', e);
      addNotification(textContent.nortificationContent.codePushFail, false);
    }
  }

  async function handleReset() {
    try {
      const res = await resetToStable();
      if (res.success) {
        document.cookie = 'owner=; path=/; max-age=0';
        setState({ state: 'stable', modifiedBy: null, modifiedAt: null });
        addNotification(textContent.nortificationContent.codeResetSuccess);
      }
    } catch (e) {
      console.error('Reset failed', e);
      addNotification(textContent.nortificationContent.codeResetFail, false);
    }
  }

  if (loading) {
    return (
      <div className="container-top w-full h-screen">
        <p className="text-xl p-8">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container-top w-full h-screen overflow-y-scroll">

      <header className="container-header w-full max-w-7xl h-[10vh] sticky top-0 left-0 z-10">
        <img src="/logo.png" className="h-10" alt="Reflex logo" />
        <h1 className="title">Reflex CI / CD</h1>
      </header>

      <main className="container-actual max-w-7xl w-full">

        <Hero onStartEdit={scrollToEditor} />

        <section ref={editorSectionRef} id="c-pg2" className="container-pg2">

          <StatusBar isModified={isModified} modifiedBy={state.modifiedBy} />

          <div className="flex flex-col md:flex-row md:gap-x-4">
            <EditorSection
              source={source}
              onChange={setSource}
              branch={state.modifiedBy ? `modified by ${state.modifiedBy}` : 'stable'}
              commitSha={state.modifiedAt ? new Date(state.modifiedAt).toISOString().slice(0, 7) : 'original'}
            />

            <div>
              <div className="flex flex-col gap-y-4 p-3">
                <UsernameInput username={username} onChange={setUsername} />
              </div>

              <ActionButtons
                onPush={handlePush}
                onReset={handleReset}
                isModified={isModified}
                owner={hasOwnerCookie}
                canPush={canPush}
                modifiedBy={state.modifiedBy}
              />
            </div>
          </div>
        </section>

        <NotificationSidebar
          notifications={notifications}
          enabled={notifEnabled}
        />

      </main>
    </div>
  );
}
