import * as React from 'react'
import { ArrowPathIcon, CloudArrowUpIcon, DocumentIcon, DocumentMagnifyingGlassIcon, FingerPrintIcon, LockClosedIcon } from '@heroicons/react/24/outline'

const features = [
  {
    name: 'Cross-Engine Compatibility',
    description:
      'Built to work with WebGL engines like Three.js, Galacean, and others, making it highly adaptable for different project needs.',
    icon: CloudArrowUpIcon,
  },
  {
    name: 'Interactive 3D Controls',
    description:
      'Enable intuitive manipulation of models with touch or mouse input for zooming, rotating, and translating.',
    icon: LockClosedIcon,
  },
  {
    name: 'Modular Architecture',
    description:
      'Highly extensible pipeline where each stage of the process (e.g., model loading, rendering, post-processing) can be customized and extended with plugins..',
    icon: ArrowPathIcon,
  },
  {
    name: 'Real-Time Debugging',
    description:
      'Built-in tools for developers to visualize the rendering pipeline, log events, and inspect model states during the development process.',
    icon: FingerPrintIcon,
  },
  {
    name: 'Plugin Support',
    description:
      'Easily extendable with custom plugins for shaders, materials, or other rendering effects.',
    icon: DocumentMagnifyingGlassIcon,
  },
  {
    name: 'Optimized for Performance',
    description:
      'Lightweight and efficient, with optimization strategies that reduce CPU and GPU load for smoother user experiences.',
    icon: DocumentIcon,
  },
]
const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="bg-white py-16 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          {/* <h2 className="text-base/7 font-semibold text-indigo-600">Deploy faster</h2> */}
          <p className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-balance">
            Chameleon
          </p>
          <p className="mt-6 text-lg/8 text-gray-700">
            Chameleon is a flexible and highly extensible 3D rendering and interaction framework designed to work seamlessly across various WebGL engines, including Three.js, Galacean, and more. It provides a modular pipeline that allows developers to load, render, and interact with 3D models efficiently, while also enabling custom extensions and interactions.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base/7 font-semibold text-gray-900">
                  <div className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-lg bg-indigo-600">
                    {React.createElement(feature.icon as React.ElementType, { 'aria-hidden': 'true', className: 'size-6 text-white' })}
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base/7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {children}
    </div>
  )
}

export default Layout 
