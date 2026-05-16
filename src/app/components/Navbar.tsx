"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/recipes", label: "Recipes" },
  { href: "/health", label: "Health" },
];

const Navbar = () => {
  const router = useRouter();

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo} onClick={() => router.push("/")}>
        Recipe Vision
      </div>

      <ul className={styles.navLinks}>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={styles.link}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
