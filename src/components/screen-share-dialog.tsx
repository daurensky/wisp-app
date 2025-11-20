import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ReactNode, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Skeleton } from './ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

export function ScreenShareDialog({
  onScreenShare,
  children,
}: {
  onScreenShare: () => void
  children: ReactNode
}) {
  const queryClient = useQueryClient()

  const {
    data: sources,
    status,
    refetch,
  } = useQuery({
    queryKey: ['desktop-captures'],
    queryFn: window.electronApi?.getDesktopCapturers ?? (() => {}),
    enabled: false,
  })

  const tabs = useMemo(
    () => ({
      window: 'Окно',
      screen: 'Экран',
    }),
    []
  )

  useEffect(() => {
    status === 'error' && toast('Не удалось получить окна для демонстрации')
  }, [status])

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      if (open && window.electronApi) {
        queryClient.resetQueries({ queryKey: ['desktop-captures'] })
        await refetch()
      }
    },
    [queryClient, refetch]
  )

  const handleScreenShare = (sourceId: string) => async () => {
    try {
      if (window.electronApi) {
        await window.electronApi.setDesktopCapturerSource(sourceId)
      }
      onScreenShare()
    } catch (e) {
      console.error(e)
      toast('Не удалось запустить демонстрацию')
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-w-screen-lg! max-h-2/3 h-full flex flex-col"
      >
        <DialogHeader>
          <DialogTitle>Выберите окно</DialogTitle>
          <DialogDescription>
            Выберите окно, которое собираетесь показать
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="window" className="h-full min-h-0 gap-4">
          <TabsList className="w-full">
            {Object.entries(tabs).map(([tabName, tabLabel]) => (
              <TabsTrigger key={tabName} value={tabName}>
                {tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(tabs).map(([tabName]) => (
            <TabsContent
              key={tabName}
              value={tabName}
              className="overflow-y-auto scrollbar-thin scrollbar-thumb-accent-foreground scrollbar-track-accent"
            >
              <div className="grid grid-cols-2 gap-4 items-start">
                {status === 'success' ? (
                  <>
                    {sources[tabName as keyof typeof tabs].map(source => (
                      <div key={source.id} className="space-y-1">
                        <DialogClose asChild>
                          <button
                            onClick={handleScreenShare(source.id)}
                            className="scale-95 hover:scale-100 transition-transform cursor-pointer"
                          >
                            <div className="w-full aspect-video rounded-lg overflow-hidden">
                              <img
                                src={source.thumbnail}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </button>
                        </DialogClose>
                        <p className="text-sm text-center truncate">
                          {source.name}
                        </p>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-[195px] w-full" />
                    ))}
                  </>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
