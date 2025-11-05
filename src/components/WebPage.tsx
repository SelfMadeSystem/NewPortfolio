import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import FancyCursor from './FancyCursor';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef } from 'react';

type Project = {
  title: string;
  description: string;
  tech: string[];
  url: string;
};

export default function WebPage() {
  const projects: Project[] = [
    {
      title: 'Métro Montréal',
      description:
        'An open-source transit companion web app for the Montreal Metro system, filling gaps in official STM information. Features detailed station layouts, optimal boarding information, and accessibility details to help commuters navigate the metro more efficiently.',
      tech: ['TypeScript', 'React', 'Motion', 'Astro', 'Cloudflare Pages'],
      url: 'https://metromtl.ca',
    },
    {
      title: 'Mead Simon Chain Mail Designs',
      description:
        'A modern e-commerce showcase for Mead Simon Chain Mail Designs, featuring their unique handcrafted fashion pieces. Built with React and seamlessly integrated with Shopify for smooth purchasing. The website boosted online sales by over 300%.',
      tech: ['React', 'TypeScript', 'Astro', 'Shopify', 'Cloudflare Pages'],
      url: 'https://meadsimon.ca/',
    },
    {
      title: "Shoghi Simon's Silly Shenanigans",
      description:
        "A playground of visual experiments and interactive effects I've built over the years. From particle systems to shader experiments, this collection showcases the creative side of web development.",
      tech: ['TypeScript', 'React', 'Astro', 'twgl.js', 'Cloudflare Pages'],
      url: 'https://shenanigans.shoghisimon.ca/',
    },
    {
      title: 'UdeMHacks',
      description:
        'Official website for UdeMHacks featuring custom WebGL animations and a sleek React interface.',
      tech: ['React', 'TypeScript', 'twgl.js', 'Next.JS', 'Cloudflare Pages'],
      url: 'https://udemhacks.com/',
    },
    {
      title: 'Abacus Cleaning Services Inc.',
      description:
        'A clean, professional website for Abacus Cleaning Services that highlights their commercial and residential offerings with an easy contact system for potential clients.',
      tech: ['HTML', 'CSS', 'JavaScript'],
      url: 'https://abacuscleaninginc.com/',
    },
  ];

  return (
    <>
      <div className="relative min-h-screen w-full cursor-none! overflow-hidden bg-linear-to-b from-slate-900 via-[#00111a] to-slate-800 px-6 py-16 text-white">
        <FancyCursor />
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10 mx-auto max-w-6xl"
        >
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-4 text-4xl font-extrabold tracking-tight md:text-6xl"
          >
            Web Development
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="max-w-2xl text-lg text-white/80"
          >
            I've been crafting web experiences since 2018, from simple business
            sites to complex applications that serve millions. Each project
            taught me something new and pushed the boundaries of what's possible
            on the web.
          </motion.p>
        </motion.header>

        <main className="relative z-10 mx-auto mt-12 flex max-w-6xl flex-col gap-8">
          <section className="col-span-1 rounded-xl border border-white/10 bg-white/3 p-6">
            <motion.h2
              className="mb-3 text-xl font-semibold"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              Projects
            </motion.h2>

            <div className="space-y-4">
              {projects.map((p, idx) => (
                <ProjectCard key={idx} project={p} />
              ))}
            </div>
          </section>
        </main>

        <footer className="relative z-10 mx-auto mt-20 max-w-6xl pb-20 text-white/70">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="text-sm"
          >
            Built with React + Tailwind + motion. This page demonstrates many
            micro-animations; strip them down for production.
          </motion.div>
        </footer>
      </div>
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const aRef = useRef<HTMLAnchorElement>(null);
  const pointerPos = usePointerPosition(aRef, {
    onlyInside: true,
    keepLast: false,
  });

  const posX = useMotionValue(0);
  const posY = useMotionValue(0);

  const x = useSpring(posX, { stiffness: 500, damping: 50 });
  const y = useSpring(posY, { stiffness: 500, damping: 50 });

  useEffect(() => {
    if (!pointerPos || !aRef.current) {
      posX.set(0);
      posY.set(0);
      return;
    }
    const rect = aRef.current.getBoundingClientRect();
    const x = pointerPos.x - rect.width / 2;
    const y = pointerPos.y - rect.height / 2;

    posX.set(x * 0.1);
    posY.set(y * 0.1);
  }, [pointerPos, posX, posY]);

  return (
    <motion.a
      ref={aRef}
      key={project.title}
      href={project.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-white/8 bg-linear-to-br from-white/3 to-white/2 p-4"
      style={{
        x,
        y,
      }}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-lg font-semibold">{project.title}</h4>
          <p className="mt-1 text-sm text-white/80">{project.description}</p>
        </div>
      </div>

      <div className="mt-3 text-xs text-white/70">
        <strong className="mr-2">Tech:</strong>
        {project.tech.join(' · ')}
      </div>
    </motion.a>
  );
}
