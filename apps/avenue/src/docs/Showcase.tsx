"use client";
// The core components, live: the same code the demo uses, in the cabin theme.
import { useState } from "react";
import kit from "@/demo/demo.module.css";
import { Icon } from "@/demo/Icon";
import { Card, IconButton, Press, Range, Segmented, Switch } from "@/demo/ui";
import s from "./docs.module.css";

export function ComponentShowcase() {
  const [on, setOn] = useState(true);
  const [temp, setTemp] = useState(21.5);
  const [fan, setFan] = useState(2);
  const [view, setView] = useState<"map" | "ar">("map");
  return (
    <div className={`${kit.kit} ${s.showcase}`} data-theme="cabin">
      <Card title="Buttons">
        <div className={s.showRow}>
          <Press variant="accent" onPress={() => {}} className={kit.chip}>
            <Icon name="play" filled size="1.1em" />
            Primary
          </Press>
          <Press onPress={() => {}} className={kit.chip}>
            Secondary
          </Press>
          <Press
            onPress={() => {}}
            className={kit.chip}
            locked="available when parked"
            label="Locked"
          >
            <Icon name="lock" size="1.1em" />
            Locked
          </Press>
          <IconButton icon="sos" label="Emergency SOS" variant="danger" onPress={() => {}} />
        </div>
      </Card>
      <Card title="Stepper">
        <div className={kit.stepper}>
          <IconButton icon="minus" label="Cooler" onPress={() => setTemp((t) => t - 0.5)} />
          <output className={kit.temp}>
            <span className="mono">{temp.toFixed(1)}</span>°
          </output>
          <IconButton icon="plus" label="Warmer" onPress={() => setTemp((t) => t + 0.5)} />
        </div>
      </Card>
      <Card title="Switch, range, segmented">
        <Switch label="Fresh air" detail="Drawing air from outside" checked={on} onChange={setOn} />
        <Range
          label="Fan"
          min={0}
          max={4}
          step={1}
          value={fan}
          onChange={setFan}
          format={(v) => (v ? `${v} of 4` : "Off")}
        />
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "map", label: "Map", icon: "map" },
            { value: "ar", label: "AR view", icon: "ar" },
          ]}
        />
      </Card>
    </div>
  );
}
