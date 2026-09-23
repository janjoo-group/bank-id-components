import { newSpecPage } from '@stencil/core/testing';
import { JgroupBankId } from './jgroup-bank-id';
import { mockPost } from '../../testing/axios-mock';

// jsdom's default user agent isn't mobile, so the component always resolves
// to the desktop 'qr' flow here - exactly the flow these tests exercise.
async function newAuthPage() {
  const page = await newSpecPage({
    components: [JgroupBankId],
    html: '<jgroup-bank-id type="auth" auth-url="/auth" collect-url="/collect" cancel-url="/cancel"></jgroup-bank-id>',
  });

  return {
    page,
    instance: page.rootInstance as InstanceType<typeof JgroupBankId>,
  };
}

function startButtonWouldRender(page: Awaited<ReturnType<typeof newSpecPage>>) {
  return (
    page.root!.shadowRoot!.querySelector('[data-test-id="start-button"]') !==
    null
  );
}

// init()/cancel() are private - they're the actual methods the start and
// cancel buttons' own onClick invoke, so driving them directly here
// exercises the real flow rather than re-implementing button-click
// plumbing in every test.
function start(instance: InstanceType<typeof JgroupBankId>) {
  return (instance as unknown as { init(): Promise<void> }).init();
}

function cancel(instance: InstanceType<typeof JgroupBankId>) {
  return (instance as unknown as { cancel(): Promise<void> }).cancel();
}

beforeEach(() => {
  mockPost.mockReset();
});

describe('jgroup-bank-id: collect() resolving "complete" with a business-logic error', () => {
  it('returns to a clickable idle state instead of staying blank forever', async () => {
    const { page, instance } = await newAuthPage();

    mockPost.mockResolvedValueOnce({
      data: {
        autoStartToken: 'token',
        transactionId: 'txn-1',
        qrCode: 'qr-data',
      },
    });
    mockPost.mockResolvedValueOnce({
      data: {
        status: 'complete',
        transactionId: 'txn-1',
        error: 'account_not_found',
      },
    });

    const completedHandler = jest.fn();
    page.root!.addEventListener('completed', completedHandler);

    await start(instance);
    await page.waitForChanges();

    // Regression check for the bug this test guards against: before the
    // fix, `status` (and on the mobile flow, `isStarting`) were never reset
    // after a "complete" collect result, so shouldRenderStartButtons
    // stayed permanently false and the widget rendered nothing at all -
    // stuck, with no way to retry short of a full page reload.
    expect(instance.isInProgress).toBe(false);
    expect(startButtonWouldRender(page)).toBe(true);
    expect(completedHandler).toHaveBeenCalledTimes(1);
    expect(completedHandler.mock.calls[0][0].detail.error).toBe(
      'account_not_found',
    );
  });
});

describe('jgroup-bank-id: collect() resolving "failed"', () => {
  it('shows only the failure alert, not the start button underneath it', async () => {
    const { page, instance } = await newAuthPage();

    mockPost.mockResolvedValueOnce({
      data: {
        autoStartToken: 'token',
        transactionId: 'txn-1',
        qrCode: 'qr-data',
      },
    });
    mockPost.mockResolvedValueOnce({
      data: {
        status: 'failed',
        transactionId: 'txn-1',
        hintCode: 'userCancel',
      },
    });

    await start(instance);
    await page.waitForChanges();

    // Before the fix, shouldRenderStartButtons didn't account for the
    // failure hint/alert already being shown, so the "Start with BankID"
    // button (with a permanently stuck spinner on the mobile flow, since
    // isStarting was never reset either) rendered at the same time as the
    // alert's own "Try again" button.
    expect(instance.isStarting).toBe(false);
    expect(startButtonWouldRender(page)).toBe(false);
  });
});

describe('jgroup-bank-id: collect() request itself failing outright', () => {
  it('resets back to idle instead of leaving a dead QR code on screen', async () => {
    const { page, instance } = await newAuthPage();

    mockPost.mockResolvedValueOnce({
      data: {
        autoStartToken: 'token',
        transactionId: 'txn-1',
        qrCode: 'qr-data',
      },
    });
    mockPost.mockRejectedValueOnce(new Error('network error'));
    // reset() itself posts to cancel-url once isInProgress is still true.
    mockPost.mockResolvedValueOnce({ data: {} });

    await start(instance);
    await page.waitForChanges();

    // Before the fix, this reset only ran for the mobile ('app') flow - on
    // desktop ('qr'), isInProgress stayed true forever, leaving the last
    // fetched QR code and cancel button on screen looking normal while
    // polling had silently died underneath, with no error shown anywhere.
    expect(instance.isInProgress).toBe(false);
    expect(startButtonWouldRender(page)).toBe(true);
  });
});

describe('jgroup-bank-id: the initial auth/sign request itself failing', () => {
  it('logs the failure and resets, instead of an unhandled promise rejection', async () => {
    const { instance } = await newAuthPage();
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    mockPost.mockRejectedValueOnce(new Error('network error'));

    // Before the fix, this branch called throwError() (which throws
    // synchronously) from inside an async method wired directly as a DOM
    // onClick handler with nothing awaiting or catching it - an unhandled
    // promise rejection with no reset and no user-visible feedback. If
    // that regresses, this same `await` re-throws and fails the test.
    await start(instance);

    expect(instance.isInProgress).toBe(false);
    expect(instance.isStarting).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('jgroup-bank-id: cancel()', () => {
  it('posts to cancel-url, emits cancelled, and resets to idle', async () => {
    const { page, instance } = await newAuthPage();

    mockPost.mockResolvedValueOnce({
      data: {
        autoStartToken: 'token',
        transactionId: 'txn-1',
        qrCode: 'qr-data',
      },
    });
    mockPost.mockResolvedValueOnce({
      data: { status: 'pending', transactionId: 'txn-1', hintCode: 'outstandingTransaction' },
    });

    // Leaves pollCollect mid-poll (status: 'pending' keeps its while loop
    // going), so cancel() below runs against a genuinely in-progress
    // transaction rather than a no-op.
    void start(instance);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.waitForChanges();

    expect(instance.isInProgress).toBe(true);

    const cancelledHandler = jest.fn();
    page.root!.addEventListener('cancelled', cancelledHandler);

    mockPost.mockResolvedValueOnce({ data: {} }); // the cancel-url POST itself

    await cancel(instance);
    await page.waitForChanges();

    expect(mockPost).toHaveBeenCalledWith('/cancel');
    expect(cancelledHandler).toHaveBeenCalledTimes(1);
    expect(instance.isInProgress).toBe(false);
    expect(instance.isCancelling).toBe(false);
    expect(startButtonWouldRender(page)).toBe(true);
  });
});

describe('jgroup-bank-id: a missing required prop', () => {
  it('renders a validation error instead of crashing', async () => {
    const page = await newSpecPage({
      components: [JgroupBankId],
      // no collect-url attribute at all
      html: '<jgroup-bank-id type="auth" auth-url="/auth" cancel-url="/cancel"></jgroup-bank-id>',
    });

    expect(page.root!.shadowRoot!.textContent).toContain(
      'The `collect-url` attribute is required.',
    );
  });
});
