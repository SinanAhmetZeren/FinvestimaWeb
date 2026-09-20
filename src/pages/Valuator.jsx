import "../valuator.css";
import TopBar from "../components/TopBar";
import { ValuatorProvider, useValuator } from "../store/valuator";
import { TrailProvider } from "../components/SourceTrail";
import { Rail } from "../components/Rail";
import { Topbar } from "../components/ValuatorTopbar";
import { Stepper } from "../components/Stepper";
import { L1Ingest } from "../screens/L1Ingest";
import { L2Reconcile } from "../screens/L2Reconcile";
import { L3Normalize } from "../screens/L3Normalize";
import { L4Model } from "../screens/L4Model";
import { L5Project } from "../screens/L5Project";
import { L6Value } from "../screens/L6Value";
import { L7Audit } from "../screens/L7Audit";

const SCREENS = {
  L1: L1Ingest, L2: L2Reconcile, L3: L3Normalize,
  L4: L4Model, L5: L5Project, L6: L6Value, L7: L7Audit,
};

function Workbench() {
  const { layer } = useValuator();
  const Screen = SCREENS[layer];
  return (
    <div className="app">
      <Rail />
      <div className="main">
        <Topbar />
        <Stepper />
        <section className="screen on">
          <Screen />
        </section>
      </div>
    </div>
  );
}

export default function Valuator() {
  return (
    <>
      <TopBar />
      <div className="valuator-root">
        <ValuatorProvider>
          <TrailProvider>
            <Workbench />
          </TrailProvider>
        </ValuatorProvider>
      </div>
    </>
  );
}
