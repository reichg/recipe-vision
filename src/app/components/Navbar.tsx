"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../styles/navbar.styles";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/parse", label: "Parse" },
  { href: "/recipes", label: "Recipes" },
  { href: "/view-image", label: "View Image" },
  { href: "/health", label: "Health" },
];

const Navbar = () => {
  const router = useRouter();
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <nav style={styles.navbar}>
      <div style={styles.logo} onClick={() => router.push("/")}>
        Recipe Vision
      </div>

      <ul style={styles.navLinks}>
        {navItems.map((item, idx) => (
          <li key={item.href}>
            <Link
              href={item.href}
              style={
                hovered === idx
                  ? { ...styles.link, ...styles.linkHover }
                  : styles.link
              }
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
