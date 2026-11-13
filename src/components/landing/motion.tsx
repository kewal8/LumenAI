"use client";

import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const group: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 20 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const draw: Variants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.9, ease: EASE } },
};

const pop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  shown: { opacity: 1, scale: 1, transition: { type: "spring", visualDuration: 0.35, bounce: 0 } },
};

type Props = React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode };

/** People who ask for reduced motion keep the fades and lose the movement. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** A block that rises into place the first time it is scrolled to. */
export function Reveal({ children, ...rest }: Props) {
  return (
    <motion.div
      {...(rest as React.ComponentProps<typeof motion.div>)}
      variants={rise}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/** A list or grid whose `Item` children arrive one after another. */
export function Stagger({
  as = "div",
  children,
  ...rest
}: Props & { as?: "div" | "ul" | "ol" }) {
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      {...(rest as React.ComponentProps<typeof motion.div>)}
      variants={group}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </Component>
  );
}

/** One entry of a `Stagger`. `lift` raises it slightly under the pointer. */
export function Item({
  as = "div",
  lift = false,
  children,
  ...rest
}: Props & { as?: "div" | "li" | "article"; lift?: boolean }) {
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      {...(rest as React.ComponentProps<typeof motion.div>)}
      variants={rise}
      whileHover={
        lift ? { y: -4, transition: { type: "spring", visualDuration: 0.25, bounce: 0 } } : undefined
      }
    >
      {children}
    </Component>
  );
}

/** A rule that draws itself from left to right inside a `Stagger`. */
export function DrawLine({ className }: { className?: string }) {
  return (
    <motion.span aria-hidden="true" className={className} variants={draw} style={{ originX: 0 }} />
  );
}

/** A mark that pops in inside a `Stagger` or `Reveal`, such as a step number. */
export function Pop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.span className={className} variants={pop}>
      {children}
    </motion.span>
  );
}

/**
 * The hero screenshot starts tipped slightly back and settles flat as the
 * page scrolls, so it reads as the thing the headline is pointing at.
 */
export function HeroTilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const rotateX = useTransform(scrollY, [0, 480], [9, 0]);
  const scale = useTransform(scrollY, [0, 480], [0.96, 1]);

  return (
    <motion.div
      className={className}
      style={reduce ? undefined : { rotateX, scale, transformPerspective: 1400, originY: 0 }}
    >
      {children}
    </motion.div>
  );
}
