import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth";
import { ConsultationContext } from "../../consultationContext";
import { useConsultation } from "../../hooks/useConsultation";
import { forgetIntroSeen, LOGIN_THEN_HOME, savePendingMessage } from "../../utils/sessionFlags";

/**
 * Holds the live conversation above the routes, so going to Medicines and back (or reloading the tab)
 * returns to the same messages. Nobody signed in means nobody's conversation: signing out (or a session
 * that turns out to have ended) clears it, so the next person at this tab can't read it.
 */
export function ConsultationProvider({ children }: { children: ReactNode }) {
  const { state: auth, sessionEnded } = useAuth();
  const navigate = useNavigate();
  const consultation = useConsultation({
    // The refused message waits in the tab and is sent again once the user has logged back in.
    onSessionEnded: (userText) => {
      savePendingMessage(userText);
      sessionEnded();
      navigate(LOGIN_THEN_HOME);
    },
  });
  const { startOver } = consultation;
  const signedOut = auth.status === "signed-out";

  useEffect(() => {
    if (signedOut) startOver();
  }, [signedOut, startOver]);

  function restart() {
    forgetIntroSeen();
    startOver();
  }

  return <ConsultationContext value={{ ...consultation, restart }}>{children}</ConsultationContext>;
}
