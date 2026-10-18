"use client";
import { type FormEvent, useState } from "react";
import { db } from "../../lib/db";
import { newId } from "../../lib/model";
import { useApp } from "../context";
import { useSchools } from "../data";
import { TopBar } from "../ui";

/** Indian academic years run April to March. */
export function currentYear(d = new Date()): string {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export default function NewClass() {
  const { t, go } = useApp();
  const schools = useSchools();
  const [schoolId, setSchoolId] = useState<string>("new");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState(currentYear());
  const [error, setError] = useState("");

  const existing = schools ?? [];
  const usingNew = schoolId === "new" || existing.length === 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (usingNew && !schoolName.trim()) return setError(t("newClass.needSchool"));
    if (!grade.trim()) return setError(t("newClass.needGrade"));
    const d = db();
    let sid = schoolId;
    if (usingNew) {
      sid = newId();
      await d.schools.add({ id: sid, name: schoolName.trim() });
    }
    const id = newId();
    await d.classes.add({
      id,
      schoolId: sid,
      grade: grade.trim(),
      section: section.trim(),
      year: year.trim(),
    });
    go(`/class/${id}/roster`, true);
  };

  return (
    <>
      <TopBar title={t("newClass.title")} back="/" />
      <main className="k-main">
        <form className="stack" onSubmit={submit} noValidate>
          {existing.length > 0 ? (
            <div className="field">
              <label htmlFor="school">{t("newClass.school")}</label>
              <select
                id="school"
                className="select"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
              >
                {existing.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="new">{t("newClass.newSchool")}</option>
              </select>
            </div>
          ) : null}
          {usingNew ? (
            <div className="field">
              <label htmlFor="school-name">{t("newClass.schoolName")}</label>
              <input
                id="school-name"
                className="input"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                autoComplete="organization"
              />
            </div>
          ) : null}
          <div className="grid2">
            <div className="field">
              <label htmlFor="grade">{t("newClass.grade")}</label>
              <input
                id="grade"
                className="input"
                inputMode="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="4"
              />
            </div>
            <div className="field">
              <label htmlFor="section">{t("newClass.section")}</label>
              <input
                id="section"
                className="input"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="B"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="year">{t("newClass.year")}</label>
            <input
              id="year"
              className="input num"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn--primary btn--block">
            {t("newClass.next")}
          </button>
        </form>
      </main>
    </>
  );
}
