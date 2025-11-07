import { useMagnet } from '../utils/hooks/useMagnet';
import { mod } from '../utils/mathUtils';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';

type Project = {
  title: string;
  description: string;
  tech: string[];
  url: string;
};

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

export default function SlideShow({ projects }: { projects: Project[] }) {
  const [index, setIndex] = useState(0);
  const direction = useRef(1);
  const velocity = useRef(0);

  const nextProject = () => {
    direction.current = 1;
    setIndex(i => i + 1);
    velocity.current = 0;
  };

  const prevProject = () => {
    direction.current = -1;
    setIndex(i => i - 1);
    velocity.current = 0;
  };

  return (
    <>
      <div className="relative h-[28rem] overflow-hidden">
        <AnimatePresence mode="sync" initial={false}>
          {/* eslint-disable-next-line react-hooks/refs */}
          {projects.map((p, i) => {
            const l = projects.length;
            const offset = mod(i - mod(index, l) + l / 2, l) - l / 2;
            if (Math.abs(offset) > 0) return null;
            return (
              <motion.div
                key={index + offset}
                className="absolute h-full w-full"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, { offset: dOffset, velocity: vel }) => {
                  const swipe = Math.abs(dOffset.x) * vel.x;

                  if (swipe < -10000) {
                    nextProject();
                  } else if (swipe > 10000) {
                    prevProject();
                  }

                  velocity.current = vel.x;
                }}
                initial={{
                  x: direction.current * 100 + '%',
                  opacity: 1,
                }}
                animate={{
                  x: 0,
                  opacity: 1,
                }}
                // @ts-expect-error apparently motion does accept functions but it's not in the types
                exit={() => ({
                  x: direction.current * -100 + '%',
                  opacity: 0.999,
                })}
                transition={{
                  type: 'spring',
                  velocity: 0,
                  stiffness: 300,
                  damping: 50,
                }}
              >
                <ProjectCard project={p} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={prevProject}
          className="cursor-pointer rounded-full bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
        >
          &larr; Previous
        </button>
        <button
          onClick={nextProject}
          className="cursor-pointer rounded-full bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
        >
          Next &rarr;
        </button>
      </div>
    </>
  );
}
