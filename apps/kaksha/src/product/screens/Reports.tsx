"use client";
// Everything a class can be handed on as: cards, a summary, a spreadsheet, the test itself.
import { useApp } from "../context";
import { useAssessments, useClass } from "../data";
import { saveText } from "../files";
import { Icon, TopBar } from "../ui";

export default function Reports({ classId }: { classId: string }) {
  const { t, go, locale } = useApp();
  const info = useClass(classId);
  const tests = useAssessments(classId);
  if (!info || !tests) return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  const label = t("class.label", { grade: info.cls.grade, section: info.cls.section });
  const latest = tests[0];
  const rows: Array<{
    key: string;
    icon: "print" | "chart" | "download" | "share";
    title: string;
    body: string;
    go?: (() => void) | undefined;
    disabled?: boolean;
  }> = [
    {
      key: "cards",
      icon: "print",
      title: t("reports.allCards"),
      body: t("reports.cardsBody"),
      go: () => go(`/class/${classId}/cards`),
    },
    {
      key: "summary",
      icon: "chart",
      title: t("results.print"),
      body: latest ? t("reports.summaryBody", { test: latest.title }) : t("class.noTests"),
      go: latest ? () => go(`/test/${latest.id}/report`) : undefined,
      disabled: !latest,
    },
    {
      key: "csv",
      icon: "download",
      title: t("results.csv"),
      body: t("reports.csvBody"),
      go: latest ? () => go(`/test/${latest.id}`) : undefined,
      disabled: !latest,
    },
    {
      key: "template",
      icon: "share",
      title: t("reports.template"),
      body: t("reports.templateBody"),
      go: latest
        ? () => {
            const tpl = {
              format: "kaksha-template",
              version: 1,
              id: `shared-${latest.id
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .slice(0, 12)}`,
              title: latest.title,
              subject: latest.subject,
              language: locale,
              kind: latest.kind,
              items: latest.items.map(({ id: _i, ...item }) => item),
            };
            saveText(
              `${latest.title.replace(/[^\p{L}\p{N}]+/gu, "-")}.json`,
              JSON.stringify(tpl, null, 2),
              "application/json",
            );
          }
        : undefined,
      disabled: !latest,
    },
  ];
  return (
    <>
      <TopBar title={t("reports.title")} sub={label} back={`/class/${classId}/students`} />
      <main className="k-main">
        <ul className="list list--gap">
          {rows.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                className="row-link row-link--card"
                onClick={r.go}
                disabled={r.disabled}
              >
                <span className="icon-tile">
                  <Icon name={r.icon} />
                </span>
                <span className="row-link__body">
                  <span className="row-link__title">{r.title}</span>
                  <span className="row-link__meta">{r.body}</span>
                </span>
                <span className="chev">
                  <Icon name="chev" />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="notice small">{t("reports.note")}</p>
      </main>
    </>
  );
}
