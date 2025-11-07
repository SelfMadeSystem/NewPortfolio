import { useMagnet } from '../utils/hooks/useMagnet';
import { mod } from '../utils/mathUtils';
import FancyCursor from './FancyCursor';
import SlideShow from './SlideShow';
import { AnimatePresence, motion } from 'motion/react';
import { use, useRef, useState } from 'react';

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

            <SlideShow projects={projects} />
          </section>
        </main>

        <footer className="relative z-10 mx-auto mt-20 max-w-6xl pb-20 text-white/70">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="mx-auto w-fit text-sm"
          >
            © {new Date().getFullYear()} Shoghi Simon. All rights reserved.
          </motion.div>
        </footer>
      </div>
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const aRef = useMagnet<HTMLAnchorElement>({
    spring: {
      stiffness: 800,
      damping: 50,
      mass: 0.5,
      bounce: 0,
    },
  });

  return (
    <div
      key={project.title}
      className="flex h-full flex-col rounded-lg border border-white/8 bg-linear-to-br from-white/3 to-white/2 p-4"
    >
      <div className="flex grow items-start justify-between">
        <div>
          <h4 className="text-lg font-semibold">{project.title}</h4>
          <p className="mt-1 text-sm text-white/80">{project.description}</p>
        </div>
      </div>

      <div className="mt-3 text-xs text-white/70">
        <strong className="mr-2">Tech:</strong>
        {project.tech.join(' · ')}
      </div>

      <motion.a
        ref={aRef}
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto mt-4 inline-block w-fit text-sm font-medium text-blue-400 hover:underline"
      >
        Visit Site &rarr;
      </motion.a>
    </div>
  );
}
