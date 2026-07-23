import { useState, useEffect, useRef } from 'react';

export default function NotificationSidebar({ notifications, enabled }) {
  const [visible, setVisible] = useState(false);
  const prevLenRef = useRef(0);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (notifications.length > prevLenRef.current && !visible) {
      setVisible(true);
      const timeout = setTimeout(() => setVisible(false), 3000);
      prevLenRef.current = notifications.length;
      return () => clearTimeout(timeout);
    }
    prevLenRef.current = notifications.length;
  }, [notifications, visible]);

  if (!enabled) return null;

  return (
    <section className="bg-transparent w-fit h-full flex flex-row fixed right-0 top-0 z-20">
      <button
        className="bg-accent btn rounded-s-sm w-fit h-fit p-2 sticky right-0 top-3 mt-20"
        onClick={() => setVisible(!visible)}
      >
        <img src="/nortification.png" className="min-w-10 h-10 aspect-square" alt="Notifications" />
      </button>

      <div>
        <ul
          className={`${
            visible ? 'w-89 px-3' : 'w-0 px-0'
          } h-full border-l-2 border-accent bg-sidebar py-3 flex flex-col justify-end duration-300`}
        >
          {notifications.map((n) => (
            <li className="w-[35ch] font-mono font-semibold" key={n.nId}>
              <p>{n.nTime} :</p>
              <p className={n.nIsSuccess ? 'text-green-500' : 'text-red-600'}>
                {n.nMsg}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
