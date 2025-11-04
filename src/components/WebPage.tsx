import { motion } from 'motion/react';

export default function WebPage() {
  const projects = [
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
    <div className="relative min-h-screen w-full overflow-hidden bg-linear-to-b from-slate-900 via-[#00111a] to-slate-800 px-6 py-16 text-white">
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
          sites to complex applications that serve millions. Each project taught
          me something new and pushed the boundaries of what's possible on the
          web.
        </motion.p>
      </motion.header>

      <main className="relative z-10 mx-auto mt-12 flex max-w-6xl flex-col gap-8">
        <section className="col-span-1 rounded-xl border border-white/10 bg-white/3 p-6 md:col-span-2">
          <motion.h2
            className="mb-4 text-2xl font-semibold"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Technologies
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="rounded-lg bg-white/4 p-4">
              <h4 className="mb-2 font-semibold">Languages</h4>
              <ul className="text-sm text-white/80">
                <li>HTML / CSS</li>
                <li>JavaScript</li>
                <li>TypeScript</li>
                <li>Java</li>
                <li>C#</li>
                <li>PHP</li>
                <li>Kotlin</li>
              </ul>
            </div>

            <div className="rounded-lg bg-white/4 p-4">
              <h4 className="mb-2 font-semibold">Frameworks</h4>
              <ul className="text-sm text-white/80">
                <li>React</li>
                <li>Next.JS</li>
                <li>Remix</li>
                <li>SvelteKit</li>
                <li>Lit.JS</li>
              </ul>
            </div>

            <div className="rounded-lg bg-white/4 p-4">
              <h4 className="mb-2 font-semibold">Services</h4>
              <ul className="text-sm text-white/80">
                <li>Cloudflare</li>
                <li>Nginx</li>
                <li>Apache2</li>
                <li>Linux</li>
              </ul>
            </div>
          </motion.div>
        </section>

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
              <motion.a
                key={p.title}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-white/8 bg-linear-to-br from-white/3 to-white/2 p-4"
                whileHover={{ y: -6, scale: 1.01 }}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold">{p.title}</h4>
                    <p className="mt-1 text-sm text-white/80">
                      {p.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/70">
                  <strong className="mr-2">Tech:</strong>
                  {p.tech.join(' · ')}
                </div>
              </motion.a>
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
  );
}
