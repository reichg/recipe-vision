"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Navbar.module.css";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/batch-process", label: "Batch Process" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function renderNavLink(
  item: (typeof navItems)[number],
  pathname: string,
  className: string,
  onNavigate?: () => void,
) {
  const isActive = isActivePath(pathname, item.href);

  return (
    <li key={item.href}>
      <Link
        href={item.href}
        className={`${className} ${isActive ? styles.linkActive : ""}`}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
      >
        {item.label}
      </Link>
    </li>
  );
}

const Navbar = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mobileMenuId = "primary-navigation-menu";

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <nav className={styles.navbar} aria-label="Primary navigation">
      <div className={styles.inner}>
        <Link
          href="/"
          className={styles.logo}
          onClick={() => setIsMenuOpen(false)}
        >
          <span className={styles.logoMark} aria-hidden="true" />
          <span className={styles.logoText}>
            <span className={styles.logoEyebrow}>Kitchen intelligence</span>
            <span className={styles.logoTitle}>Recipe Vision</span>
          </span>
        </Link>

        <button
          type="button"
          className={`${styles.menuToggle} ${
            isMenuOpen ? styles.menuToggleOpen : ""
          }`}
          aria-expanded={isMenuOpen}
          aria-controls={mobileMenuId}
          aria-label={
            isMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className={styles.menuToggleLabel}>Menu</span>
          <span className={styles.menuToggleIcon} aria-hidden="true">
            <span className={styles.menuToggleBar} />
            <span className={styles.menuToggleBar} />
            <span className={styles.menuToggleBar} />
          </span>
        </button>

        <div className={styles.actions}>
          <ul className={styles.navLinks}>
            {navItems.map((item) => renderNavLink(item, pathname, styles.link))}
          </ul>

          <Link href="/upload" className={`${styles.cta} ${styles.desktopCta}`}>
            Start Parsing
          </Link>
        </div>

        <div
          id={mobileMenuId}
          className={`${styles.mobileMenu} ${
            isMenuOpen ? styles.mobileMenuOpen : ""
          }`}
        >
          <ul className={styles.mobileNavLinks}>
            {navItems.map((item) =>
              renderNavLink(
                item,
                pathname,
                `${styles.link} ${styles.mobileLink}`,
                () => setIsMenuOpen(false),
              ),
            )}
          </ul>

          <Link
            href="/upload"
            className={`${styles.cta} ${styles.mobileCta}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Start Parsing
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
