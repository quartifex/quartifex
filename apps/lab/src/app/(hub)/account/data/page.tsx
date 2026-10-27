import styles from "@/components/account/Account.module.css";
import { DeleteAccount } from "@/components/account/DeleteAccount";

export const metadata = { title: "Your data" };

export default function DataPage() {
  return (
    <>
      <h1 className={styles.h1}>Your data</h1>
      <section className={styles.section}>
        <h2>Export</h2>
        <p className={styles.muted}>
          Download everything we hold for your account: profile, saved items, collections and
          tickets, as one JSON file.
        </p>
        <div>
          {/* A file download, so a plain anchor rather than client navigation. */}
          <a className={styles.btn} href="/account/data/export" download>
            Download my data
          </a>
        </div>
      </section>
      <section className={styles.section}>
        <h2>Delete account</h2>
        <p className={styles.muted}>
          Deleting removes your profile, saved items, collections and tickets for good, and signs
          you out everywhere.
        </p>
        <DeleteAccount />
      </section>
    </>
  );
}
